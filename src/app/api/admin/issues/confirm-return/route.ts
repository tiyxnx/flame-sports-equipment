import { NextRequest, NextResponse } from "next/server";
import { dbStore, isAdminEmail } from "@/lib/db/store";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { issueId, adminId, adminEmail, notes } = body;

    if (!issueId || (!adminId && !adminEmail)) {
      return NextResponse.json(
        { error: "issueId and adminId or adminEmail are required." },
        { status: 400 }
      );
    }

    const admin = (adminId ? dbStore.getUserById(adminId) : undefined) ||
      (isAdminEmail(adminEmail) ? dbStore.getUserByEmail(adminEmail) : undefined);

    if (!admin || admin.role !== "admin" || !isAdminEmail(admin.email)) {
      return NextResponse.json(
        { error: "Access denied. Administrator privileges required to confirm returns." },
        { status: 403 }
      );
    }

    const result = await dbStore.confirmPhysicalReturn({
      issueId,
      adminId: admin.id,
      notes,
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      issue: result.issue,
      message: "Physical return confirmed successfully. Item returned to inventory and student active issue cleared.",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to confirm physical return";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
