import { NextRequest, NextResponse } from "next/server";
import { dbStore } from "@/lib/db/store";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      userId,
      issueId,
      acknowledgement,
      photoUrl,
      studentNotes,
      damageReported,
      damageDescription,
    } = body;

    if (!userId || !issueId) {
      return NextResponse.json(
        { error: "User ID and Issue ID are required." },
        { status: 400 }
      );
    }

    if (!acknowledgement) {
      return NextResponse.json(
        {
          error:
            "Mandatory acknowledgement required: You must confirm that you are returning the same equipment and checked its condition.",
        },
        { status: 400 }
      );
    }

    const result = await dbStore.submitReturn({
      userId,
      issueId,
      acknowledgement: Boolean(acknowledgement),
      photoUrl,
      studentNotes,
      damageReported: Boolean(damageReported),
      damageDescription,
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      issue: result.issue,
      message:
        "Return submitted successfully. Physical receipt will be verified by the equipment room handler.",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to submit equipment return";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
