import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

const INTENT_PROMPT = `당신은 한화손해보험 FP(설계사)의 영업활동을 지원하는 AI 어시스턴트의 쿼리 파서입니다.
사용자의 입력이 FP 영업활동(고객 조회, 관리)과 관련이 있는지 먼저 판단하고, 관련된 경우 고객 필터 의도를 파악하세요.

【중요】 아래 중 하나라도 해당하면 반드시 off_topic으로 분류하세요:
- 보험 영업과 무관한 일반 대화 (날씨, 맛집, 농담, 개인 감정 등)
- 시스템/앱 동작 방식에 대한 질문 (어떻게 알아?, 왜 이래? 등)
- 개인정보 처리 방식에 대한 의구심이나 항의
- 고객 조회와 무관한 지시나 요청

가능한 고객 조회 intent (FP 영업 관련인 경우에만):

[이벤트/활동 기반]
- birthday: 오늘 생일인 고객 (예: "오늘 생일인 고객", "생일 고객")
- birth_month: 특정 월 또는 이번 달 생일 고객 → params.month (숫자, 없으면 null=이번달)
- expiry: 만기/갱신 고객 (자동차·장기 만기 도래, 장기 갱신)
- expiry_months: N개월 이내 만기 도래 고객 → params.months (예: 3개월 이내 → 3)
- overdue: 연체/미인출 고객 (장기 연체·미납, 자동이체 미인출)
- thankyou: 체결 감사 고객 (신규 체결, 감사 인사)
- untouched: 미터치/미접촉 고객 (오랫동안 연락 없는)
- low_coverage: 주요담보 저가입 고객
- plan_expiry: 가입설계 동의 만료 고객

[고객 속성 기반]
- gender_filter: 성별별 조회 → params.gender ("남" 또는 "여")
- age_filter: 연령대별 조회 → params.ageMin, params.ageMax (예: 50대 → 50, 60)
- insurance_type: 보험 종류별 → params.insuranceType
  * "car" = 자동차보험 (CA) 고객: "자동차", "차보험", "카보험"
  * "long_term" = 장기보험 (LA) 고객: "장기", "장기보험"
  * "general" = 일반보험 (GA) 고객: "일반", "일반보험", "GA"
  * "both" = 전체 (종류 무관)
  ※ "일반"은 보험 영업에서 항상 일반보험(GA)을 의미합니다. 긴급도 '보통'으로 혼동하지 마세요.
- urgency_filter: 긴급도별 → params.urgency ("urgent"=긴급, "high"=높음, "normal"=보통, "low"=낮음)
  ※ "일반"은 urgency_filter가 아니라 insurance_type(general)으로 분류하세요.

[담보/상품 기반 — CRM 연동 필요]
- no_product: 특정 상품 미가입 고객 → params.productType
  (암보험=cancer, 실손보험=loss_ins, 운전자보험=driver, 치매보험=dementia, 자녀보험=child)
- has_claim: 사고이력/클레임 고객

[데이터 조회 — CSV 기반]
- fp_list: 지점 설계사 목록 조회 (예: "설계사 명단", "우리 지점 설계사", "설계사 목록")
- fp_customers: 특정 설계사의 담당 고객 조회 → targetName에 설계사 이름 (예: "김한화 설계사 고객", "이수연 담당 고객")
- my_customers: 본인(로그인 FP) 담당 고객 조회 (예: "내 고객", "내 담당 고객", "내가 담당하는 고객")
- csv_gender_filter: 성별 기반 고객 조회 → params.gender ("남" 또는 "여") (예: "남자 고객", "여성 고객 목록", "여자 고객 몇 명")
- csv_age_filter: 연령대 기반 고객 조회 → params.ageMin, params.ageMax (예: "60대 고객"→60,70 / "50세 이상"→50,999) (예: "60대 고객", "30대 고객 보여줘")
※ 복합 조건: "50대 여자 고객"처럼 연령+성별 동시 조건이면 csv_age_filter를 선택하되, params.gender도 반드시 함께 채우세요. 마찬가지로 csv_gender_filter 선택 시에도 연령 조건이 있으면 params.ageMin/ageMax를 채우세요.
- workplace_search: 직장명으로 고객 검색 → params.keyword (예: "삼성전자 다니는 고객"→keyword:"삼성전자", "LG 고객"→keyword:"LG")
- marketing_consent: 마케팅 활용 동의 고객 조회 (예: "마케팅 동의 고객", "마케팅 동의한 고객", "마케팅 활용 동의")
- csv_birth_month: 특정 월 생일 고객 조회 (CSV 기반) → params.month (예: "3월 생일 고객"→month:3)
- product_ranking: 상품별 가입 건수/인기순위 (예: "인기 상품", "많이 가입한 상품", "상품 순위")
- product_list: 전체 취급 상품 목록 (예: "상품 목록", "취급 상품", "어떤 상품")
- customer_coverage: 특정 고객의 가입상품/담보/계약 상세 조회 → targetName에 고객명 (예: "고한준 가입 담보", "고한준 계약 정보", "박종석 가입 상품")
- expiry_coverage: 만기 도래 담보/계약 조회 → params.months에 개월수 (예: "올해 만기 담보"→12, "3개월 내 만기 계약"→3, "만기 도래 담보"→12)
- product_search: 특정 상품명으로 가입 현황 검색 → params.keyword에 상품 키워드 (예: "암보험 가입 현황"→keyword:"암보험", "실손보험 가입자"→keyword:"실손", "종신보험 가입 고객"→keyword:"종신")
- coverage_search: 특정 담보명으로 가입 현황 검색 → params.keyword에 담보 키워드 (예: "사망보험금 가입자"→keyword:"사망보험금", "입원의료비 담보"→keyword:"입원의료비")

[고객 구분]
- prospect: 가망고객 (신규 가망, 잠재 고객)
- transferred: 이관고객 (이관된 고객)
- name_search: 특정 고객 이름 검색 → targetName에 이름
- all: 오늘 터치할 고객 전체 (daily touch 리스트). "전체 고객", "내 고객" 등 FP 보유 전체 고객 요청은 my_customers를 사용하세요.
- off_topic: FP 영업활동과 무관한 입력

다음 JSON 형식으로만 응답하세요:
{"intent":"<intent>","targetName":"<이름 또는 null>","params":{"gender":null,"ageMin":null,"ageMax":null,"insuranceType":null,"productType":null,"month":null,"months":null,"urgency":null,"keyword":null},"reasoning":"<판단 근거를 한 문장으로>"}

params에서 해당 없는 필드는 null로 두세요.`;

export async function POST(req: NextRequest) {
  try {
    const { query } = (await req.json()) as { query: string };
    if (!query?.trim()) {
      return NextResponse.json({ intent: "all", targetName: null, params: {}, reasoning: "빈 쿼리 → 전체 고객 반환" });
    }

    let raw = "";
    try {
      // Responses API (신규 모델)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await (getOpenAI() as any).responses.create({
        model: MODEL,
        input: `${INTENT_PROMPT}\n\n사용자 입력: "${query}"`,
      });
      raw = typeof response?.output_text === "string" ? response.output_text : "";
      if (!raw && Array.isArray(response?.output)) {
        for (const item of response.output) {
          if (item?.type === "message" && Array.isArray(item?.content)) {
            for (const c of item.content) {
              if (c?.type === "output_text") { raw = c.text; break; }
            }
          }
          if (raw) break;
        }
      }
    } catch {
      // Chat Completions fallback
      const completion = await getOpenAI().chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: INTENT_PROMPT },
          { role: "user", content: `사용자 입력: "${query}"` },
        ],
        max_completion_tokens: 300,
        response_format: { type: "json_object" },
      });
      raw = completion.choices[0]?.message?.content ?? "";
    }

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in LLM response");
    const parsed = JSON.parse(jsonMatch[0]) as {
      intent: string;
      targetName?: string | null;
      params?: Record<string, unknown>;
      reasoning?: string;
    };

    return NextResponse.json({
      intent: parsed.intent ?? "all",
      targetName: parsed.targetName ?? null,
      params: parsed.params ?? {},
      reasoning: parsed.reasoning ?? "",
      raw,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[parse-query] Error:", message);
    return NextResponse.json({
      intent: "all",
      targetName: null,
      params: {},
      reasoning: `파싱 오류 (폴백): ${message}`,
      error: message,
    });
  }
}
