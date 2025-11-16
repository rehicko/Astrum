import { NextResponse } from "next/server";

export async function GET() {
  const env = process.env;

  return NextResponse.json(
    {
      BNET_CLIENT_ID_present: typeof env.BNET_CLIENT_ID === "string" && env.BNET_CLIENT_ID.length > 0,
      BNET_REGION_present: typeof env.BNET_REGION === "string" && env.BNET_REGION.length > 0,
      BNET_CLIENT_SECRET_present:
        typeof env.BNET_CLIENT_SECRET === "string" && env.BNET_CLIENT_SECRET.length > 0,
      // do NOT return the actual values – just presence
      vercel_flag: env.VERCEL ?? null,
      node_env: env.NODE_ENV ?? null,
    },
    { status: 200 }
  );
}
