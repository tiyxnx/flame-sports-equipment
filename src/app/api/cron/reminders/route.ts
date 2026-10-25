import { NextRequest, NextResponse } from "next/server";
import { dbStore } from "@/lib/db/store";

export async function GET(req: NextRequest) {
  return handleReminders(req);
}

export async function POST(req: NextRequest) {
  return handleReminders(req);
}

async function handleReminders(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized cron execution." }, { status: 401 });
    }

    const result = await dbStore.run10PmReminders();

    return NextResponse.json({
      success: true,
      message: `10 PM IST Reminder check executed. Sent ${result.count} reminder notifications.`,
      dispatched: result.count,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error executing reminder cron";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
