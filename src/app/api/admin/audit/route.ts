import { NextRequest, NextResponse } from "next/server";
import { dbStore, isAdminEmail } from "@/lib/db/store";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const adminEmail = searchParams.get("adminEmail");

    if (!isAdminEmail(adminEmail)) {
      return NextResponse.json({ error: "Administrator authorization required." }, { status: 403 });
    }

    const auditLogs = await dbStore.getAuditLogs();
    const verificationEvents = await dbStore.getVerificationEvents();
    const damageReports = await dbStore.getDamageReports();

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
