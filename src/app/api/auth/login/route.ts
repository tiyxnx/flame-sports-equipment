import { NextRequest, NextResponse } from "next/server";
import { dbStore } from "@/lib/db/store";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, name } = body;

    if (!email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    const result = dbStore.authenticateUser(email, name);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 403 });
    }

    return NextResponse.json({ user: result.user });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal authentication error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
