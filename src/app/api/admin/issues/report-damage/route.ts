import { NextRequest, NextResponse } from "next/server";
import { dbStore, isAdminEmail } from "@/lib/db/store";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { inventoryItemId, adminId, adminEmail, description, photoUrl, issueId } = body;

    if (!inventoryItemId || (!adminId && !adminEmail) || !description) {
      return NextResponse.json(
        { error: "Inventory item, admin authorization, and damage description are required." },
        { status: 400 }
      );
    }

    const admin = (adminId ? dbStore.getUserById(adminId) : undefined) ||
      (isAdminEmail(adminEmail) ? dbStore.getUserByEmail(adminEmail) : undefined);

    if (!admin || admin.role !== "admin" || !isAdminEmail(admin.email)) {
      return NextResponse.json(
        { error: "Access denied. Administrator privileges required to report damage." },
        { status: 403 }
      );
    }

    const result = await dbStore.reportDamage({
      inventoryItemId,
      adminId: admin.id,
      description,
      photoUrl,
      issueId,
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      report: result.report,
      message: "Damage report filed. Item marked unavailable and notification sent to the last student issuer.",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to file damage report";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
