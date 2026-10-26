import { NextRequest, NextResponse } from "next/server";
import { dbStore, isAdminEmail } from "@/lib/db/store";
import { sendEmailNotification } from "@/lib/email-service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { adminEmail, recipientEmail } = body;

    if (!isAdminEmail(adminEmail)) {
      return NextResponse.json(
        { error: "Access denied. Administrator privileges required." },
        { status: 403 }
      );
    }

    const targetRecipient = recipientEmail?.trim() || "tiyanashah21@gmail.com";

    const emailLog = await sendEmailNotification({
      type: "admin_unreturned_reminder",
      recipientEmail: targetRecipient,
      recipientName: "FLAME Sports Administrator",
      sportName: "Badminton",
      equipmentTypeName: "Racket",
      equipmentNumber: "#1",
      issueTimestamp: new Date().toISOString(),
    });

    await dbStore.logNotification(emailLog);

    return NextResponse.json({
      success: emailLog.delivery_status === "sent",
      emailLog,
      message:
        emailLog.delivery_status === "sent"
          ? `Test email dispatched successfully! ${emailLog.error_message || ""}`
          : `Email dispatch failed: ${emailLog.error_message}`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to send test email";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
