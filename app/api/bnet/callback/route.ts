// app/api/bnet/callback/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

// --- Supabase (service role) ---
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// --- Types for Blizzard API ---
type WowCharacterFromApi = {
  name: string;
  level: number;
  realm?: { slug?: string; name?: string };
  faction?: { type?: string; name?: string };
  playable_class?: { id?: number; name?: string };
};

type WowAccountFromApi = {
  id?: string;
  characters?: WowCharacterFromApi[];
};

type WowProfileFromApi = {
  id?: string;
  wow_accounts?: WowAccountFromApi[];
};

export async function GET(req: NextRequest) {
  // DEV: hard-wire to Ajay's Supabase user id
  const userId = "9f148901-0082-4869-9196-a7d921f78cfc";

  const url = new URL(req.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return NextResponse.json(
      {
        status: "error",
        step: "missing_code",
        message: "No ?code in callback URL",
      },
      { status: 400 }
    );
  }

  const clientId = process.env.BNET_CLIENT_ID;
  const clientSecret = process.env.BNET_CLIENT_SECRET;
  const region = process.env.BNET_REGION || "us";
  const redirectUri = process.env.BNET_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.json(
      {
        status: "error",
        step: "env",
        message: "Missing Battle.net env vars",
        details: {
          has_client_id: !!clientId,
          has_client_secret: !!clientSecret,
          has_redirect_uri: !!redirectUri,
        },
      },
      { status: 500 }
    );
  }

  try {
    // 1) Exchange code for access token
    const tokenRes = await fetch("https://oauth.battle.net/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization:
          "Basic " +
          Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });

    const tokenText = await tokenRes.text();

    if (!tokenRes.ok) {
      return NextResponse.json(
        {
          status: "error",
          step: "token",
          message: "Failed to exchange code for token",
          http_status: tokenRes.status,
          details: tokenText,
        },
        { status: 500 }
      );
    }

    let accessToken: string | undefined;
    try {
      const tokenJson = JSON.parse(tokenText) as { access_token?: string };
      accessToken = tokenJson.access_token;
    } catch {
      const params = new URLSearchParams(tokenText);
      accessToken = params.get("access_token") ?? undefined;
    }

    if (!accessToken) {
      return NextResponse.json(
        {
          status: "error",
          step: "token_missing",
          message: "No access_token in Battle.net token response",
          raw: tokenText,
        },
        { status: 500 }
      );
    }

    // 2) Fetch WoW profile using Authorization header (no access_token in query)
    const profileUrl = `https://${region}.api.blizzard.com/profile/user/wow?namespace=profile-${region}&locale=en_US`;

    const profileRes = await fetch(profileUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    const profileText = await profileRes.text();

    if (!profileRes.ok) {
      return NextResponse.json(
        {
          status: "error",
          step: "profile",
          message: "Failed to fetch WoW profile",
          http_status: profileRes.status,
          requested_url: profileUrl,
          details: profileText,
        },
        { status: 500 }
      );
    }

    let profileJson: WowProfileFromApi;
    try {
      profileJson = JSON.parse(profileText) as WowProfileFromApi;
    } catch {
      return NextResponse.json(
        {
          status: "error",
          step: "profile_parse",
          message: "Could not parse WoW profile JSON",
          raw: profileText,
        },
        { status: 500 }
      );
    }

    const wowAccounts = profileJson.wow_accounts ?? [];

    // 3) Flatten characters for Supabase
    const rowsToInsert: {
      user_id: string;
      account_id: string | null;
      name: string;
      realm_slug: string;
      realm_name: string | null;
      faction: string | null;
      class_name: string | null;
      class_id: number | null;
      level: number | null;
    }[] = [];

    for (const acct of wowAccounts) {
      const accountId = acct.id ?? profileJson.id ?? null;
      const chars = acct.characters ?? [];
      for (const c of chars) {
        rowsToInsert.push({
          user_id: userId,
          account_id: accountId,
          name: c.name,
          realm_slug: c.realm?.slug ?? "unknown",
          realm_name: c.realm?.name ?? null,
          faction: c.faction?.type ?? c.faction?.name ?? null,
          class_name: c.playable_class?.name ?? null,
          class_id: c.playable_class?.id ?? null,
          level: typeof c.level === "number" ? c.level : null,
        });
      }
    }

    if (rowsToInsert.length === 0) {
      return NextResponse.redirect(
        new URL("/profile?bnet=linked&chars=0", req.url)
      );
    }

    // 4) Wipe existing chars for this user and insert fresh ones
    await supabase.from("wow_characters").delete().eq("user_id", userId);

    const { error: insertError } = await supabase
      .from("wow_characters")
      .insert(rowsToInsert);

    if (insertError) {
      return NextResponse.json(
        {
          status: "error",
          step: "insert_characters",
          message: "Failed to save WoW characters",
          details: insertError.message,
        },
        { status: 500 }
      );
    }

    // 5) Redirect back to profile with count
    return NextResponse.redirect(
      new URL("/profile?bnet=linked&chars=" + rowsToInsert.length, req.url)
    );
  } catch (err: any) {
    return NextResponse.json(
      {
        status: "error",
        step: "unhandled",
        message: "Unhandled error in Battle.net callback",
        details: String(err?.message ?? err),
      },
      { status: 500 }
    );
  }
}
