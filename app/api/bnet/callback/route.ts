// app/api/bnet/callback/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseClient";

function getEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

export async function GET(req: NextRequest) {
  const supabase = createClient();

  const code = req.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.json({ error: "Missing ?code" }, { status: 400 });
  }

  const clientId = getEnv("BNET_CLIENT_ID");
  const clientSecret = getEnv("BNET_CLIENT_SECRET");
  const region = process.env.BNET_REGION || "us";

  const redirectUri =
    process.env.BNET_REDIRECT_URI ||
    `${process.env.NEXT_PUBLIC_SITE_URL}/api/bnet/callback`;

  // STEP 1: Exchange code → access token
  const tokenRes = await fetch(
    `https://${region}.battle.net/oauth/token`,
    {
      method: "POST",
      headers: {
        Authorization:
          "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
        code,
      }),
    }
  );

  if (!tokenRes.ok) {
    const text = await tokenRes.text();
    return NextResponse.json(
      { error: "Token exchange failed", details: text },
      { status: 400 }
    );
  }

  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token;

  // STEP 2: Fetch WoW account profile
  const profileRes = await fetch(
    `https://${region}.api.blizzard.com/profile/user/wow?namespace=profile-${region}&locale=en_US`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  const profileJson = await profileRes.json();

  // Pull some basic values
  const battletag = profileJson.battletag || null;

  // STEP 3: Get current session user ID
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL}/crossroads/global`
    );
  }

  // STEP 4: Store into linked_accounts table
  const { error } = await supabase
    .from("linked_accounts")
    .upsert(
      {
        provider: "bnet",
        provider_user_id: battletag,
        owner: user.id,
        data: profileJson,
      },
      { onConflict: "provider_user_id" }
    );

  if (error) {
    console.error("Supabase insertion error:", error);
    return NextResponse.json(
      { error: "Failed to store linked account", details: error },
      { status: 500 }
    );
  }

  // STEP 5: Redirect back to Astrum profile page
  return NextResponse.redirect(
    `${process.env.NEXT_PUBLIC_SITE_URL}/profile`
  );
}
