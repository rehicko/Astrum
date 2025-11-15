// app/api/bnet/callback/route.ts
import { NextRequest, NextResponse } from "next/server";

function getEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");

  if (!code) {
    return NextResponse.json(
      { status: "error", message: "Missing ?code in callback URL" },
      { status: 400 }
    );
  }

  const clientId = getEnv("BNET_CLIENT_ID");
  const clientSecret = getEnv("BNET_CLIENT_SECRET");
  const region = process.env.BNET_REGION || "us";

  const redirectUri =
    process.env.BNET_REDIRECT_URI ||
    `${process.env.NEXT_PUBLIC_SITE_URL}/api/bnet/callback`;

  // 1) Exchange code → access token
  const tokenRes = await fetch(`https://${region}.battle.net/oauth/token`, {
    method: "POST",
    headers: {
      Authorization:
        "Basic " +
        Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
      code,
    }),
  });

  if (!tokenRes.ok) {
    const text = await tokenRes.text();
    return NextResponse.json(
      {
        status: "error",
        step: "token_exchange",
        message: "Failed to exchange code for access token",
        details: text,
      },
      { status: 400 }
    );
  }

  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token as string | undefined;

  if (!accessToken) {
    return NextResponse.json(
      {
        status: "error",
        step: "token_parse",
        message: "No access_token in Battle.net response",
        raw: tokenData,
      },
      { status: 400 }
    );
  }

  // 2) Fetch WoW account profile
  const profileRes = await fetch(
    `https://${region}.api.blizzard.com/profile/user/wow?namespace=profile-${region}&locale=en_US`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  const profileJson = await profileRes.json();

  if (!profileRes.ok) {
    return NextResponse.json(
      {
        status: "error",
        step: "profile_fetch",
        message: "Failed to fetch WoW profile",
        details: profileJson,
      },
      { status: 400 }
    );
  }

  const battletag = (profileJson as any).battletag ?? null;

  // 3) Just return data for now (no Supabase yet)
  return NextResponse.json(
    {
      status: "ok",
      message: "Battle.net OAuth successful",
      state,
      battletag,
      rawProfile: profileJson,
    },
    { status: 200 }
  );
}
