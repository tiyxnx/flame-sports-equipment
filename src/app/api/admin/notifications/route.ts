import { NextRequest, NextResponse } from "next/server";
import { dbStore } from "@/lib/db/store";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const adminEmail = searchParams.get("adminEmail");

    if (adminEmail !== "asmi.malushte@flame.edu.in") {
      return NextResponse.json({ error: "Administrator authorization required." }, { status: 403 });
    }

    const notifications = dbStore.getNotificationLogs();
    return NextResponse.json({ notifications });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch notifications";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
