// app/link/bnet/page.tsx
import { redirect } from "next/navigation";

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export default function BattleNetLinkPage() {
  const clientId = getEnv("BNET_CLIENT_ID");
  const region = process.env.BNET_REGION || "us";

  const redirectUri =
    process.env.BNET_REDIRECT_URI ||
    `${process.env.NEXT_PUBLIC_SITE_URL}/api/bnet/callback`;

  const authUrl = new URL(`https://${region}.battle.net/oauth/authorize`);

  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "wow.profile");

  // REQUIRED by Blizzard OAuth — prevents 400 error
  authUrl.searchParams.set("state", crypto.randomUUID());

  redirect(authUrl.toString());
}
