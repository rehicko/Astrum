// app/api/bnet/callback/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

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
  id?: string; // user/overall account id
  wow_accounts?: WowAccountFromApi[];
};

export async function GET(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.redirect(new URL("/crossroads/login", req.url));
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return NextResponse.json(
      { status: "error", step: "missing_code", message: "No ?code in callback URL" },
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
          "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenRes.ok) {
      const text = await tokenRes.text();
      return NextResponse.json(
        {
          status: "error",
          step: "token",
          message: "Failed to exchange code for token",
          details: text,
        },
        { status: 500 }
      );
    }

    const tokenJson = (await tokenRes.json()) as { access_token?: string };
    const accessToken = tokenJson.access_token;

    if (!accessToken) {
      return NextResponse.json(
        {
          status: "error",
          step: "token_missing",
          message: "No access_token in Battle.net token response",
        },
        { status: 500 }
      );
    }

    // 2) Fetch WoW profile
    const profileUrl = `https://${region}.api.blizzard.com/profile/user/wow?namespace=profile-${region}&locale=en_US&access_token=${encodeURIComponent(
      accessToken
    )}`;

    const profileRes = await fetch(profileUrl);

    if (!profileRes.ok) {
      const text = await profileRes.text();
      return NextResponse.json(
        {
          status: "error",
          step: "profile",
          message: "Failed to fetch WoW profile",
          details: text,
        },
        { status: 500 }
      );
    }

    const profileJson = (await profileRes.json()) as WowProfileFromApi;

    const wowAccounts = profileJson.wow_accounts ?? [];

    // 3) Flatten all characters across all accounts
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
          user_id: user.id,
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

    // If no characters, just redirect back with info
    if (rowsToInsert.length === 0) {
      return NextResponse.redirect(
        new URL("/profile?bnet=linked&chars=0", req.url)
      );
    }

    // 4) Clear old characters for this user and insert fresh ones
    await supabase.from("wow_characters").delete().eq("user_id", user.id);

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

    // 5) Redirect back to profile – we’ll build the "pick main" UI there later
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
