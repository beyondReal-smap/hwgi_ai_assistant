import { NextRequest, NextResponse } from "next/server";
import { getDailyTouchByStfno } from "@/lib/daily-touch-data";

const urgencyOrder: Record<string, number> = { urgent: 0, high: 1, normal: 2, low: 3 };

export async function POST(req: NextRequest) {
  try {
    const { stfno } = (await req.json()) as { stfno: string };

    if (!stfno) {
      return NextResponse.json(
        { customers: [], totalCount: 0 },
        { status: 400 }
      );
    }

    const customers = getDailyTouchByStfno(stfno)
      .sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);

    return NextResponse.json({
      customers,
      totalCount: customers.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[daily-touch] Error:", message);
    return NextResponse.json(
      { customers: [], totalCount: 0, error: message },
      { status: 500 }
    );
  }
}
