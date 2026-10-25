import { NextRequest, NextResponse } from "next/server";
import { dbStore } from "@/lib/db/store";

export async function GET(req: NextRequest) {
  return handleOverdue(req);
}

export async function POST(req: NextRequest) {
  return handleOverdue(req);
}

async function handleOverdue(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized cron execution." }, { status: 401 });
    }

    const result = await dbStore.run11PmOverdueJob();

    return NextResponse.json({
      success: true,
      message: `11 PM IST Overdue check executed. Identified & notified ${result.count} overdue items.`,
      dispatched: result.count,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error executing overdue cron";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
