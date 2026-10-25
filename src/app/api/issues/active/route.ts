import { NextRequest, NextResponse } from "next/server";
import { dbStore } from "@/lib/db/store";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId is required." }, { status: 400 });
    }

    const activeIssue = dbStore.getActiveIssueForUser(userId);

    return NextResponse.json({
      activeIssue,
      hasActiveIssue: Boolean(activeIssue),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch active issue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
