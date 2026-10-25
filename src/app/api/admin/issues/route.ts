import { NextRequest, NextResponse } from "next/server";
import { dbStore } from "@/lib/db/store";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const adminEmail = searchParams.get("adminEmail");

    if (adminEmail !== "asmi.malushte@flame.edu.in") {
      return NextResponse.json({ error: "Access denied. Administrator privileges required." }, { status: 403 });
    }

    const sport = searchParams.get("sport");
    const status = searchParams.get("status");
    const search = searchParams.get("search")?.toLowerCase();

    let issues = dbStore.getAllIssues();

    if (sport && sport !== "all") {
      issues = issues.filter((i) => i.sport_id === sport || i.sport_name.toLowerCase() === sport.toLowerCase());
    }

    if (status && status !== "all") {
      issues = issues.filter((i) => i.status === status);
    }

    if (search) {
      issues = issues.filter(
        (i) =>
          i.user_email.toLowerCase().includes(search) ||
          i.user_name.toLowerCase().includes(search) ||
          i.equipment_number.toLowerCase().includes(search) ||
          i.equipment_type_name.toLowerCase().includes(search) ||
          i.sport_name.toLowerCase().includes(search)
      );
    }

    const inventory = dbStore.getInventory();
    const metrics = {
      totalInventory: inventory.length,
      availableItems: inventory.filter((i) => i.status === "available").length,
      currentlyIssued: issues.filter((i) => i.status === "issued").length,
      pendingReturnConfirmations: issues.filter((i) => i.status === "return_submitted").length,
      overdueItems: issues.filter((i) => i.status === "overdue" || i.status === "not_returned").length,
      reportedDamaged: inventory.filter((i) => i.status === "damaged").length,
      missingOrInspection: inventory.filter((i) => i.status === "missing" || i.status === "under_inspection").length,
    };

    return NextResponse.json({
      issues,
      metrics,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to retrieve issues";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
