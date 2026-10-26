import { NextRequest, NextResponse } from "next/server";
import { dbStore } from "@/lib/db/store";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, userEmail, userName, inventoryItemId, disclaimerAcknowledged } = body;

    if ((!userId && !userEmail) || !inventoryItemId) {
      return NextResponse.json(
        { error: "User identity and Inventory Item ID are required." },
        { status: 400 }
      );
    }

    if (!disclaimerAcknowledged) {
      return NextResponse.json(
        { error: "You must accept the mandatory liability disclaimer before issuing equipment." },
        { status: 400 }
      );
    }

    const result = await dbStore.issueEquipment({
      userId,
      userEmail,
      userName,
      inventoryItemId,
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 409 });
    }

    return NextResponse.json({
      success: true,
      issue: result.issue,
      message: "Equipment issued successfully. A confirmation email has been dispatched.",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to process equipment issue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
