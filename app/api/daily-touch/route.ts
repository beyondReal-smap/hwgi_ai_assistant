import { NextRequest, NextResponse } from "next/server";
import { getDailyTouchByStfno, buildTodosFromTouch } from "@/lib/daily-touch-data";
import { getFPList, getCustomersByFP } from "@/lib/csv-data";
import { validateRequest, DailyTouchSchema } from "@/lib/validation";

const urgencyOrder: Record<string, number> = { urgent: 0, high: 1, normal: 2, low: 3 };

export async function POST(req: NextRequest) {
  try {
    const v = validateRequest(DailyTouchSchema, await req.json());
    if (!v.success) return NextResponse.json({ customers: [], totalCount: 0, customerCount: 0, todos: [] }, { status: 400 });
    const { stfno } = v.data;

    const customers = getDailyTouchByStfno(stfno)
      .sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);

    // stfno → FP name → 보유 고객 수
    const fpList = getFPList();
    const fp = fpList.find((f) => f.staffNo === stfno);
    const customerCount = fp ? getCustomersByFP(fp.name).length : 0;

    // 이벤트 타입별 할일 생성
    const todos = buildTodosFromTouch(stfno);

    return NextResponse.json({
      customers,
      totalCount: customers.length,
      customerCount,
      todos,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[daily-touch] Error:", message);
    return NextResponse.json(
      { customers: [], totalCount: 0, customerCount: 0, todos: [], error: message },
      { status: 500 }
    );
  }
}
