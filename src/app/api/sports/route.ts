import { NextRequest, NextResponse } from "next/server";
import { dbStore } from "@/lib/db/store";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sportId = searchParams.get("sportId");

    const sports = await dbStore.getSports();
    const equipmentTypes = await dbStore.getEquipmentTypes(sportId || undefined);

    return NextResponse.json({
      sports,
      equipmentTypes,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load sports";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
