import { NextRequest, NextResponse } from "next/server";
import { dbStore } from "@/lib/db/store";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sportId = searchParams.get("sportId");
    const equipmentTypeId = searchParams.get("equipmentTypeId");

    if (!sportId || !equipmentTypeId) {
      return NextResponse.json(
        { error: "Both sportId and equipmentTypeId query parameters are required." },
        { status: 400 }
      );
    }

    const items = await dbStore.getAvailableItems(sportId, equipmentTypeId);

    return NextResponse.json({
      items,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load inventory";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
