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

    const activeIssue = await dbStore.getActiveIssueForUser(userId || "", userEmail);

    return NextResponse.json({
      activeIssue,
      hasActiveIssue: Boolean(activeIssue),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch active issue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
