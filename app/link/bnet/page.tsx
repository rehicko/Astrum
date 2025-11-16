// app/link/bnet/page.tsx
export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";

// Figure out our base URL for both local + Vercel
function getBaseUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL!;
  }

  if (process.env.VERCEL === "1") {
    // Vercel prod fallback
    return "https://astrum-ten.vercel.app";
  }

  // Local dev fallback
  return "http://localhost:3000";
}

// Simple state value (no crypto issues)
function makeState() {
  return `${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

export default function BattleNetLinkPage() {
  const clientId = process.env.BNET_CLIENT_ID;
  const region = process.env.BNET_REGION || "us";
  const baseUrl = getBaseUrl();
  const redirectUri = `${baseUrl}/api/bnet/callback`;

  // If config is missing on the server, DON'T throw – just show it.
  if (!clientId) {
    return (
      <main style={{ padding: "2rem", fontFamily: "system-ui" }}>
        <h1>Battle.net config error</h1>
        <p>
          <code>BNET_CLIENT_ID</code> is <b>missing at runtime</b>.
        </p>
        <p>
          Environment:{" "}
          {process.env.VERCEL === "1" ? "Vercel (production)" : "Local/dev"}
        </p>
        <p>
          Base URL I computed: <code>{baseUrl}</code>
        </p>
        <p>
          Callback I will use: <code>{redirectUri}</code>
        </p>
        <p>
          On Vercel, go to <b>Project → Settings → Environment Variables</b> and
          make sure <code>BNET_CLIENT_ID</code> is defined for{" "}
          <b>Production</b>, then redeploy.
        </p>
      </main>
    );
  }

  const authUrl = new URL(`https://${region}.battle.net/oauth/authorize`);
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "wow.profile");
  authUrl.searchParams.set("state", makeState());

  // If everything is good, send the user to Battle.net
  return redirect(authUrl.toString());
}
