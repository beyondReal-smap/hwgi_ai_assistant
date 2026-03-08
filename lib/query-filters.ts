import type { Customer } from "@/lib/types";

export type QueryIntent =
  // 이벤트/활동 기반
  | "birthday"
  | "birth_month"
  | "expiry"
  | "expiry_months"
  | "overdue"
  | "thankyou"
  | "untouched"
  | "low_coverage"
  | "plan_expiry"
  // 고객 속성 기반
  | "gender_filter"
  | "age_filter"
  | "insurance_type"
  | "urgency_filter"
  // 담보/상품 기반 (CRM 연동 필요)
  | "no_product"
  | "has_claim"
  | "prospect"
  | "transferred"
  // 데이터 조회 (CSV 기반)
  | "fp_list"
  | "fp_customers"
  | "my_customers"
  | "csv_gender_filter"
  | "csv_age_filter"
  | "workplace_search"
  | "marketing_consent"
  | "csv_birth_month"
  | "product_ranking"
  | "product_list"
  | "customer_coverage"
  | "expiry_coverage"
  | "product_search"
  | "coverage_search"
  // 보험 약관/보상 기준
  | "silson_search"
  // 기타
  | "name_search"
  | "all"
  | "off_topic";

export interface QueryParams {
  gender?: string | null;
  ageMin?: number | null;
  ageMax?: number | null;
  insuranceType?: string | null;
  productType?: string | null;
  month?: number | null;
  months?: number | null;
  urgency?: string | null;
  keyword?: string | null;
}

export interface ParsedQuery {
  intent: QueryIntent;
  targetName: string | null;
  params?: QueryParams;
  reasoning: string;
  raw?: string;
}

export const urgencyOrder: Record<string, number> = { urgent: 0, high: 1, normal: 2, low: 3 };

// CRM 연동이 필요한 intent (mock 데이터로 필터 불가)
export const CRM_REQUIRED_INTENTS = new Set<QueryIntent>([
  "no_product", "has_claim", "prospect", "transferred",
]);

// CSV 데이터 조회 intent
export const CSV_DATA_INTENTS = new Set<QueryIntent>([
  "fp_list", "fp_customers", "my_customers",
  "csv_gender_filter", "csv_age_filter", "workplace_search", "marketing_consent", "csv_birth_month",
  "product_ranking", "product_list",
  "customer_coverage", "expiry_coverage", "product_search", "coverage_search",
]);

const PRODUCT_TYPE_LABEL: Record<string, string> = {
  cancer: "암보험",
  loss_ins: "실손보험",
  driver: "운전자보험",
  dementia: "치매보험",
  child: "자녀보험",
};

export function filterByIntent(customers: Customer[], intent: QueryIntent, targetName: string | null, query: string, params: QueryParams = {}): Customer[] {
  switch (intent) {
    case "birthday":
      return customers.filter((c) => c.event === "본인 생일");

    case "birth_month": {
      const month = params.month ?? new Date().getMonth() + 1;
      return customers.filter((c) => {
        const m = parseInt(c.birthDate.split("-")[1], 10);
        return m === month;
      }).sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);
    }

    case "expiry":
      return customers.filter(
        (c) =>
          c.event === "자동차 만기 도래" ||
          c.event === "장기 만기 도래" ||
          c.event === "장기 갱신"
      );

    case "expiry_months": {
      const months = params.months ?? 3;
      const cutoff = new Date();
      cutoff.setMonth(cutoff.getMonth() + months);
      // daily_touch 데이터에는 products가 없으므로 eventDate 기반으로 필터
      return customers.filter((c) => {
        if (c.eventDate) {
          const date = new Date(c.eventDate);
          return date <= cutoff && date >= new Date();
        }
        return c.event === "자동차 만기 도래" || c.event === "장기 만기 도래" || c.event === "장기 갱신";
      }).sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);
    }

    case "overdue":
      return customers.filter(
        (c) => c.event === "장기 연체(미납)" || c.event === "장기 자동이체 미인출"
      );

    case "thankyou":
      return customers.filter((c) => c.event === "장기 체결 감사");

    case "untouched":
      return customers.filter((c) => c.event === "미터치고객" || c.event === "장기 미터치 이관고객 안내");

    case "low_coverage":
      return customers.filter((c) => c.event === "주요담보 저가입고객 안내" || c.event === "담보 부족고객");

    case "plan_expiry":
      return customers.filter((c) => c.event === "가입설계동의 만료");

    case "gender_filter": {
      const g = params.gender;
      if (!g) return [...customers].sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);
      return customers.filter((c) => c.gender === g)
        .sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);
    }

    case "age_filter": {
      const min = params.ageMin ?? 0;
      const max = params.ageMax ?? 999;
      return customers.filter((c) => c.age >= min && c.age <= max)
        .sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);
    }

    case "insurance_type": {
      const t = params.insuranceType;
      if (t === "car")
        return customers.filter((c) => c.carCount > 0)
          .sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);
      if (t === "long_term")
        return customers.filter((c) => c.longTermCount > 0)
          .sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);
      if (t === "general")
        return [];
      return [...customers].sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);
    }

    case "urgency_filter": {
      const u = params.urgency;
      if (!u) return [...customers].sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);
      return customers.filter((c) => c.urgency === u);
    }

    case "name_search": {
      const name = targetName ?? query;
      const nameMatches = customers.filter((c) => c.name.includes(name));
      if (nameMatches.length > 0) return nameMatches;
      return [...customers].sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);
    }

    // CRM 연동 필요 — 빈 배열 반환 (핸들러에서 별도 처리)
    case "no_product":
    case "has_claim":
    case "prospect":
    case "transferred":
      return [];

    case "all":
    default:
      return [...customers].sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);
  }
}

export function getCrmRequiredMessage(intent: QueryIntent, params: QueryParams): string {
  if (intent === "no_product") {
    const label = PRODUCT_TYPE_LABEL[params.productType ?? ""] ?? params.productType ?? "해당 상품";
    return `${label} 미가입 고객 조회는 CRM 담보특성 데이터와 연동이 필요합니다.\n실제 시스템에서는 SFA_CTM_INFO_CVR_CND 테이블 기반으로 조회됩니다.`;
  }
  if (intent === "has_claim") return "사고이력 고객 조회는 CRM 계약특성 데이터(사고건수 CLMCT)와 연동이 필요합니다.";
  if (intent === "prospect") return "가망고객 조회는 CRM 고객특성 데이터(BZ_FMLCU_FLGCD='90')와 연동이 필요합니다.";
  if (intent === "transferred") return "이관고객 조회는 CRM 고객특성 데이터(TA_CTM_YN='1')와 연동이 필요합니다.";
  return "해당 조회는 CRM 연동이 필요합니다.";
}

export function getBotText(intent: QueryIntent, params: QueryParams, count: number): string {
  switch (intent) {
    case "birthday": return `오늘 생일인 고객 ${count}명이 있습니다. 따뜻한 생일 메시지를 보내드리세요!`;
    case "birth_month": {
      const m = params.month ?? new Date().getMonth() + 1;
      return `${m}월 생일 고객 ${count}명입니다. 생일 축하 메시지로 관계를 강화하세요!`;
    }
    case "expiry": return `만기 도래 및 갱신 예정 고객 ${count}명을 찾았습니다. 각 고객의 계약 현황을 확인하고 연락해보세요.`;
    case "expiry_months": return `${params.months ?? 3}개월 이내 만기 도래 고객 ${count}명입니다. 만기일 순으로 정렬되었습니다.`;
    case "overdue": return `연체 및 자동이체 미인출 고객 ${count}명입니다. 빠른 연락이 필요합니다.`;
    case "thankyou": return `체결 감사 안내 대상 고객 ${count}명입니다. 감사 인사로 관계를 강화하세요.`;
    case "untouched": return `장기 미접촉 고객 ${count}명입니다. 관계 재구축이 필요합니다.`;
    case "low_coverage": return `주요담보 저가입 고객 ${count}명입니다. 담보 보강 제안을 검토하세요.`;
    case "plan_expiry": return `가입설계 동의 만료 예정 고객 ${count}명입니다. 동의 연장 안내가 필요합니다.`;
    case "gender_filter": return `${params.gender ?? "해당"} 고객 ${count}명입니다. 긴급도 순으로 정렬되었습니다.`;
    case "age_filter": {
      const label = params.ageMax ? `${params.ageMin}~${params.ageMax}세` : `${params.ageMin}세 이상`;
      return `${label} 고객 ${count}명입니다.`;
    }
    case "insurance_type": {
      const typeLabel: Record<string, string> = { car: "자동차보험", long_term: "장기보험", general: "일반보험(GA)" };
      const label = typeLabel[params.insuranceType ?? ""] ?? "보험";
      if (params.insuranceType === "general" && count === 0)
        return `일반보험(GA) 고객 조회는 CRM 연동이 필요합니다. 현재 데모 데이터에는 일반보험 고객이 포함되어 있지 않습니다.`;
      return `${label} 가입 고객 ${count}명입니다.`;
    }
    case "urgency_filter": {
      const labels: Record<string, string> = { urgent: "긴급", high: "높음", normal: "보통", low: "낮음" };
      return `긴급도 [${labels[params.urgency ?? ""] ?? params.urgency}] 고객 ${count}명입니다.`;
    }
    case "name_search": return `검색 결과 ${count}명의 고객을 찾았습니다.`;
    case "all": return `오늘 터치가 필요한 고객 ${count}명을 확인했습니다. 긴급도 순으로 정렬되었습니다.`;
    default: return `고객 ${count}명을 찾았습니다.`;
  }
}
