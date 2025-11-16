// app/link/bnet/page.tsx
export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";

// Figure out our base URL in a safe way for both local + Vercel
function getBaseUrl() {
  // If you set this, it wins
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL!;
  }

  // On Vercel in production, default to your live URL
  if (process.env.VERCEL === "1") {
    return "https://astrum-ten.vercel.app";
  }

  // Fallback for local dev
  return "http://localhost:3000";
}

// Simple state value — avoids any crypto issues
function makeState() {
  return `${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

export default function BattleNetLinkPage() {
  const clientId = process.env.BNET_CLIENT_ID;
  const region = process.env.BNET_REGION || "us";

  if (!clientId) {
    // If this ever hits on Vercel, it means BNET_CLIENT_ID isn't
    // actually available at runtime.
    throw new Error("BNET_CLIENT_ID is not set on the server");
  }

  const baseUrl = getBaseUrl();
  const redirectUri = `${baseUrl}/api/bnet/callback`;

  const authUrl = new URL(`https://${region}.battle.net/oauth/authorize`);
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "wow.profile");
  authUrl.searchParams.set("state", makeState());

  return redirect(authUrl.toString());
}
