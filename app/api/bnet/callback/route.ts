// app/api/bnet/callback/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  // Just echo the query back so we can see what Battle.net sends
  const params = Object.fromEntries(req.nextUrl.searchParams.entries());

  return NextResponse.json(
    {
      status: "ok",
      message: "BNet callback route is working on Vercel.",
      query: params,
    },
    { status: 200 }
  );
}
