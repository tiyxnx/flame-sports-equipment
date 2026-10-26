import { NextRequest, NextResponse } from "next/server";
import { dbStore } from "@/lib/db/store";

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
      (adminEmail === "asmi.malushte@flame.edu.in" ? dbStore.getUserByEmail(adminEmail) : undefined);

    if (!admin || admin.role !== "admin" || admin.email !== "asmi.malushte@flame.edu.in") {
      return NextResponse.json(
        { error: "Access denied. Only the authorized administrator (asmi.malushte@flame.edu.in) can execute this action." },
        { status: 403 }
      );
    }

    const result = await dbStore.markNotReturned({
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
      message: "Item recorded as Not Returned. Outstanding issue remains active and item remains unavailable.",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to record Not Returned status";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
