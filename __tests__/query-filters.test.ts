import { describe, it, expect } from "vitest";
import type { Customer } from "@/lib/types";
import { filterByIntent, getBotText, getCrmRequiredMessage, urgencyOrder } from "@/lib/query-filters";

const mockCustomer = (overrides: Partial<Customer> = {}): Customer => ({
  id: "1",
  name: "홍길동",
  gender: "남",
  age: 45,
  birthDate: "1980-03-15",
  event: "본인 생일",
  eventDetail: "생일 축하",
  products: [],
  urgency: "normal",
  lastContact: "2024-01-01",
  contactHistory: [],
  longTermCount: 2,
  carCount: 1,
  ...overrides,
});

describe("filterByIntent", () => {
  const customers = [
    mockCustomer({ id: "1", name: "김생일", event: "본인 생일", urgency: "high" }),
    mockCustomer({ id: "2", name: "이연체", event: "장기 연체(미납)", urgency: "urgent" }),
    mockCustomer({ id: "3", name: "박만기", event: "자동차 만기 도래", urgency: "normal" }),
    mockCustomer({ id: "4", name: "최감사", event: "장기 체결 감사", urgency: "low" }),
    mockCustomer({ id: "5", name: "정미터치", event: "미터치고객", urgency: "normal" }),
    mockCustomer({ id: "6", name: "김여성", event: "본인 생일", gender: "여", age: 55, urgency: "high" }),
  ];

  it("filters birthday customers", () => {
    const result = filterByIntent(customers, "birthday", null, "");
    expect(result).toHaveLength(2);
    expect(result.every((c) => c.event === "본인 생일")).toBe(true);
  });

  it("filters overdue customers", () => {
    const result = filterByIntent(customers, "overdue", null, "");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("이연체");
  });

  it("filters by expiry", () => {
    const result = filterByIntent(customers, "expiry", null, "");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("박만기");
  });

  it("filters thankyou customers", () => {
    const result = filterByIntent(customers, "thankyou", null, "");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("최감사");
  });

  it("filters untouched customers", () => {
    const result = filterByIntent(customers, "untouched", null, "");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("정미터치");
  });

  it("filters by gender", () => {
    const result = filterByIntent(customers, "gender_filter", null, "", { gender: "여" });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("김여성");
  });

  it("filters by age range", () => {
    const result = filterByIntent(customers, "age_filter", null, "", { ageMin: 50, ageMax: 60 });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("김여성");
  });

  it("filters by name search", () => {
    const result = filterByIntent(customers, "name_search", "이연체", "이연체");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("이연체");
  });

  it("returns all sorted by urgency for 'all' intent", () => {
    const result = filterByIntent(customers, "all", null, "");
    expect(result).toHaveLength(6);
    expect(result[0].urgency).toBe("urgent");
  });

  it("returns empty for CRM-required intents", () => {
    expect(filterByIntent(customers, "no_product", null, "")).toHaveLength(0);
    expect(filterByIntent(customers, "has_claim", null, "")).toHaveLength(0);
  });

  it("filters insurance_type=car by carCount", () => {
    const result = filterByIntent(customers, "insurance_type", null, "", { insuranceType: "car" });
    expect(result.every((c) => c.carCount > 0)).toBe(true);
  });
});

describe("getBotText", () => {
  it("returns birthday text", () => {
    const text = getBotText("birthday", {}, 3);
    expect(text).toContain("생일");
    expect(text).toContain("3");
  });

  it("returns overdue text with urgency", () => {
    const text = getBotText("overdue", {}, 2);
    expect(text).toContain("연체");
  });

  it("returns insurance type text for general", () => {
    const text = getBotText("insurance_type", { insuranceType: "general" }, 0);
    expect(text).toContain("일반보험");
  });
});

describe("getCrmRequiredMessage", () => {
  it("returns product-specific message", () => {
    const msg = getCrmRequiredMessage("no_product", { productType: "cancer" });
    expect(msg).toContain("암보험");
  });

  it("returns generic CRM message for has_claim", () => {
    const msg = getCrmRequiredMessage("has_claim", {});
    expect(msg).toContain("CRM");
  });
});

describe("urgencyOrder", () => {
  it("orders urgent < high < normal < low", () => {
    expect(urgencyOrder["urgent"]).toBeLessThan(urgencyOrder["high"]);
    expect(urgencyOrder["high"]).toBeLessThan(urgencyOrder["normal"]);
    expect(urgencyOrder["normal"]).toBeLessThan(urgencyOrder["low"]);
  });
});
