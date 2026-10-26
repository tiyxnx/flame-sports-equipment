import { NextRequest, NextResponse } from "next/server";
import { dbStore, isAdminEmail } from "@/lib/db/store";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { adminEmail, issueId } = body;

    if (!isAdminEmail(adminEmail)) {
      return NextResponse.json(
        { error: "Access denied. Administrator privileges required." },
        { status: 403 }
      );
    }

    if (!issueId) {
      return NextResponse.json(
        { error: "Issue ID is required." },
        { status: 400 }
      );
    }

    const result = await dbStore.sendAdminReminder({ adminEmail, issueId });

    if (!result.success || result.error) {
      return NextResponse.json(
        { error: result.error || "Failed to send reminder email." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      emailLog: result.emailLog,
      message: `Pre-drafted return notice sent to ${result.emailLog?.recipient_email}`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to process reminder request";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
