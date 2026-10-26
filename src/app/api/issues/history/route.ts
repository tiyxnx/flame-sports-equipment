import { NextRequest, NextResponse } from "next/server";
import { dbStore } from "@/lib/db/store";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId") || undefined;
    const userEmail = searchParams.get("userEmail") || undefined;

    if (!userId && !userEmail) {
      return NextResponse.json({ error: "userId or userEmail is required." }, { status: 400 });
    }

    const issues = await dbStore.getUserIssues(userId, userEmail);

    return NextResponse.json({
      success: true,
      issues,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch student issue history";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
