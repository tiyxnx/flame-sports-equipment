import { NextRequest, NextResponse } from "next/server";
import { dbStore } from "@/lib/db/store";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { inventoryItemId, adminId, description, photoUrl, issueId } = body;

    if (!inventoryItemId || !adminId || !description) {
      return NextResponse.json(
        { error: "Inventory item, admin ID, and damage description are required." },
        { status: 400 }
      );
    }

    const admin = dbStore.getUserById(adminId);
    if (!admin || admin.role !== "admin" || admin.email !== "asmi.malushte@flame.edu.in") {
      return NextResponse.json(
        { error: "Access denied. Only the authorized administrator (asmi.malushte@flame.edu.in) can report damage." },
        { status: 403 }
      );
    }

    const result = await dbStore.reportDamage({
      inventoryItemId,
      adminId,
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
