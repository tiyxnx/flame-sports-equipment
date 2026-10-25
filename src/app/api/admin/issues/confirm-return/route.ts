import { NextRequest, NextResponse } from "next/server";
import { dbStore } from "@/lib/db/store";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { issueId, adminId, notes } = body;

    if (!issueId || !adminId) {
      return NextResponse.json(
        { error: "issueId and adminId are required." },
        { status: 400 }
      );
    }

    const admin = dbStore.getUserById(adminId);
    if (!admin || admin.role !== "admin" || admin.email !== "asmi.malushte@flame.edu.in") {
      return NextResponse.json(
        { error: "Access denied. Only the authorized administrator (asmi.malushte@flame.edu.in) can confirm returns." },
        { status: 403 }
      );
    }

    const result = dbStore.confirmPhysicalReturn({
      issueId,
      adminId,
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
