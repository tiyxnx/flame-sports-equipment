import { NextRequest, NextResponse } from "next/server";
import { dbStore } from "@/lib/db/store";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const adminEmail = searchParams.get("adminEmail");

    if (adminEmail !== "asmi.malushte@flame.edu.in") {
      return NextResponse.json({ error: "Administrator authorization required." }, { status: 403 });
    }

    const auditLogs = dbStore.getAuditLogs();
    const verificationEvents = dbStore.getVerificationEvents();
    const damageReports = dbStore.getDamageReports();

    return NextResponse.json({
      auditLogs,
      verificationEvents,
      damageReports,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch audit records";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
