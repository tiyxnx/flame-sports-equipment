import { NextRequest, NextResponse } from "next/server";
import { dbStore } from "@/lib/db/store";
import { InventoryItemStatus } from "@/types";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const adminEmail = searchParams.get("adminEmail");

    if (adminEmail !== "asmi.malushte@flame.edu.in") {
      return NextResponse.json({ error: "Administrator authorization required." }, { status: 403 });
    }

    const items = dbStore.getInventory();
    return NextResponse.json({ items });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch inventory";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sport_id, equipment_type_id, equipment_number, admin_id } = body;

    const admin = dbStore.getUserById(admin_id);
    if (!admin || admin.role !== "admin" || admin.email !== "asmi.malushte@flame.edu.in") {
      return NextResponse.json({ error: "Administrator authorization required." }, { status: 403 });
    }

    const result = dbStore.addInventoryItem({
      sport_id,
      equipment_type_id,
      equipment_number,
      admin_id,
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, item: result.item });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to add inventory item";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { itemId, status, admin_id, notes } = body;

    const admin = dbStore.getUserById(admin_id);
    if (!admin || admin.role !== "admin" || admin.email !== "asmi.malushte@flame.edu.in") {
      return NextResponse.json({ error: "Administrator authorization required." }, { status: 403 });
    }

    const result = dbStore.updateInventoryItemStatus(
      itemId,
      status as InventoryItemStatus,
      admin_id,
      notes
    );

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: `Status updated to ${status}.` });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update item status";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
