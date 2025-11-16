// app/api/debug-cookies/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(req: NextRequest) {
  // @ts-ignore – Next cookies() is fine at runtime
  const all = cookies().getAll();

  const safe = all.map((c: any) => ({
    name: c.name,
    // just show a short preview so we can see the format
    valuePreview:
      typeof c.value === "string"
        ? c.value.slice(0, 80)
        : String(c.value).slice(0, 80),
  }));

  return NextResponse.json({ cookies: safe });
}
