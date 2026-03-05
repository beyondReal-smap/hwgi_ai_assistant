import { NextRequest, NextResponse } from "next/server";
import {
  getFPList,
  getCustomersByFP,
  getAllCustomers,
  getProductRanking,
  getProductList,
  getGoodsDetailByCustomer,
  getCoveragesByCustomer,
  getCustomerProducts,
  getCoveragesExpiringSoon,
  searchByProductName,
  searchByCoverageName,
  getCustomersByGender,
  getCustomersByAge,
  getCustomersByWorkplace,
  getCustomersWithMarketingConsent,
  getCustomersByBirthMonth,
  formatDate,
  calculateAge,
  genderLabel,
  type CsvCustomer,
  type CsvGoodsDetail,
  type CsvCoverageWithProduct,
} from "@/lib/csv-data";

interface QueryCsvRequest {
  intent: string;
  targetName?: string | null;
  fpName?: string | null;
  params?: {
    months?: number | null;
    keyword?: string | null;
    gender?: string | null;
    ageMin?: number | null;
    ageMax?: number | null;
    month?: number | null;
  };
}

// ─── Table Formatter ─────────────────────────────────────

function customerTable(customers: CsvCustomer[]): string {
  const header = "| # | 이름 | 성별 | 나이 | 생년월일 | 직장 | 마케팅 |";
  const divider = "|---|------|------|------|----------|------|--------|";
  const rows = customers.map((c, i) => {
    const age = calculateAge(c.birthYear);
    const sex = genderLabel(c.gender);
    const birth = `${c.birthYear}-${c.birthMndy.slice(0, 2)}-${c.birthMndy.slice(2, 4)}`;
    const wp = c.workplace || "-";
    const mkt = c.marketingConsent === "Y" ? "O" : "-";
    return `| ${i + 1} | ${c.customerName} | ${sex} | ${age} | ${birth} | ${wp} | ${mkt} |`;
  });
  return [header, divider, ...rows].join("\n");
}

// ─── Format Functions ────────────────────────────────────

function formatFPList(): string {
  const fps = getFPList();
  const header = "| # | 설계사명 | 사번 |";
  const divider = "|---|----------|------|";
  const rows = fps.map((fp, i) => `| ${i + 1} | ${fp.name} | ${fp.staffNo} |`);
  return `📋 신주안지점 설계사 목록 (${fps.length}명)\n\n${[header, divider, ...rows].join("\n")}`;
}

function formatFPCustomers(fpName: string): string {
  const customers = getCustomersByFP(fpName).sort((a, b) => a.customerName.localeCompare(b.customerName, "ko"));
  if (customers.length === 0) {
    return `"${fpName}" 설계사의 담당 고객을 찾을 수 없습니다. 설계사명을 다시 확인해주세요.`;
  }
  return `📋 ${fpName} 설계사 담당 고객 (${customers.length}명)\n\n${customerTable(customers)}`;
}

function formatMyCustomers(fpName: string): string {
  const customers = getCustomersByFP(fpName).sort((a, b) => a.customerName.localeCompare(b.customerName, "ko"));
  if (customers.length === 0) {
    return `${fpName} FP님의 담당 고객 데이터가 없습니다.`;
  }
  return `📋 ${fpName} FP님 담당 고객 (${customers.length}명)\n\n${customerTable(customers)}`;
}

function formatGenderFilter(gender: string, fpName?: string): string {
  const customers = getCustomersByGender(gender, fpName);
  const label = gender === "남" ? "남성" : "여성";
  const scope = fpName ? ` (${fpName} FP)` : "";
  if (customers.length === 0) {
    return `${label} 고객이 없습니다.${scope}`;
  }
  return `👤 ${label} 고객${scope} (${customers.length}명)\n\n${customerTable(customers)}`;
}

function formatAgeFilter(ageMin: number, ageMax: number, fpName?: string): string {
  const customers = getCustomersByAge(ageMin, ageMax, fpName);
  const label = ageMax < 999 ? `${ageMin}~${ageMax}세` : `${ageMin}세 이상`;
  const scope = fpName ? ` (${fpName} FP)` : "";
  if (customers.length === 0) {
    return `${label} 고객이 없습니다.${scope}`;
  }
  return `👤 ${label} 고객${scope} (${customers.length}명)\n\n${customerTable(customers)}`;
}

function formatWorkplaceSearch(keyword: string, fpName?: string): string {
  const customers = getCustomersByWorkplace(keyword, fpName);
  const scope = fpName ? ` (${fpName} FP)` : "";
  if (customers.length === 0) {
    return `"${keyword}" 관련 직장 고객을 찾을 수 없습니다.${scope}`;
  }
  return `🏢 "${keyword}" 직장 고객${scope} (${customers.length}명)\n\n${customerTable(customers)}`;
}

function formatMarketingConsent(fpName?: string): string {
  const customers = getCustomersWithMarketingConsent(fpName);
  const all = fpName ? getCustomersByFP(fpName) : getAllCustomers();
  const scope = fpName ? ` (${fpName} FP)` : "";
  return `📩 마케팅 활용 동의 고객${scope} (${customers.length}명 / 전체 ${all.length}명)\n\n${customerTable(customers)}`;
}

function formatBirthMonthCustomers(month?: number, fpName?: string): string {
  const customers = getCustomersByBirthMonth(month, fpName);
  const targetMonth = month ?? (new Date().getMonth() + 1);
  const scope = fpName ? ` (${fpName} FP)` : "";
  if (customers.length === 0) {
    return `${targetMonth}월 생일 고객이 없습니다.${scope}`;
  }
  return `🎂 ${targetMonth}월 생일 고객${scope} (${customers.length}명)\n\n${customerTable(customers)}`;
}

function formatProductRanking(): string {
  const products = getProductRanking();
  const header = "| # | 상품명 | 가입건수 |";
  const divider = "|---|--------|----------|";
  const rows = products.map((p, i) => `| ${i + 1} | ${p.productName} | ${p.count}건 |`);
  return `📊 상품별 가입 건수 (인기순)\n\n${[header, divider, ...rows].join("\n")}`;
}

function formatProductList(): string {
  const products = getProductList();
  const header = "| # | 상품코드 | 상품명 | 가입건수 |";
  const divider = "|---|----------|--------|----------|";
  const rows = products.map((p, i) => `| ${i + 1} | ${p.productCode} | ${p.productName} | ${p.count}건 |`);
  return `📋 취급 상품 목록 (${products.length}종)\n\n${[header, divider, ...rows].join("\n")}`;
}

function formatCustomerCoverage(customerName: string): string {
  const details = getGoodsDetailByCustomer(customerName);
  if (details.length === 0) {
    return `"${customerName}" 고객의 가입 담보 정보를 찾을 수 없습니다. 고객명을 다시 확인해주세요.`;
  }

  const products = getCustomerProducts(customerName);

  // 증권별 그룹
  const policyGroups = new Map<string, CsvGoodsDetail[]>();
  for (const d of details) {
    const arr = policyGroups.get(d.policyNo) ?? [];
    arr.push(d);
    policyGroups.set(d.policyNo, arr);
  }

  const sections: string[] = [];
  for (const [policyNo, items] of policyGroups) {
    const productName = items[0].productName;
    const cvrLines = items.map((d, i) => {
      const prefix = i === items.length - 1 ? "└" : "├";
      return `${prefix} ${d.coverageName} (${d.coverageCode}) | ${formatDate(d.insuranceStart)} ~ ${formatDate(d.insuranceEnd)}`;
    });
    sections.push(`증권번호: ${policyNo}\n상품: ${productName}\n${cvrLines.join("\n")}`);
  }

  const customerInfo = getAllCustomers().find((c) => c.customerName === customerName);
  let header = `📋 ${customerName} 고객 가입 현황`;
  if (customerInfo) {
    const age = calculateAge(customerInfo.birthYear);
    const sex = genderLabel(customerInfo.gender);
    const wp = customerInfo.workplace ? ` | ${customerInfo.workplace}` : "";
    header = `📋 ${customerName} 고객 가입 현황 (${sex}, ${age}세${wp})`;
  }

  return `${header}\n\n${sections.join("\n\n")}\n\n총 ${products.length}건 증권, ${details.length}건 담보`;
}

function formatExpiryCoverage(months: number): string {
  const coverages = getCoveragesExpiringSoon(months);
  if (coverages.length === 0) {
    return `${months}개월 이내 만기 도래 담보가 없습니다.`;
  }

  const policySet = new Set(coverages.map((c) => c.policyNo));
  const header = "| 고객명 | 상품명 | 증권번호 | 담보명 | 만기일 |";
  const divider = "|--------|--------|----------|--------|--------|";
  const rows = coverages.map(
    (c) => `| ${c.customerName} | ${c.productName} | ${c.policyNo} | ${c.coverageName} | ${formatDate(c.insuranceEnd)} |`
  );
  return `📅 ${months}개월 이내 만기 도래 담보 (${coverages.length}건, 증권 ${policySet.size}건)\n\n${[header, divider, ...rows].join("\n")}`;
}

function formatProductSearch(keyword: string): string {
  const details = searchByProductName(keyword);
  if (details.length === 0) {
    return `"${keyword}" 관련 상품 가입 내역을 찾을 수 없습니다.`;
  }

  const customerSet = new Set(details.map((d) => d.customerName));
  const policySet = new Set(details.map((d) => d.policyNo));

  const byCustomer = new Map<string, CsvGoodsDetail[]>();
  for (const d of details) {
    const arr = byCustomer.get(d.customerName) ?? [];
    arr.push(d);
    byCustomer.set(d.customerName, arr);
  }

  const header = "| 고객명 | 상품명 | 주요 담보 |";
  const divider = "|--------|--------|-----------|";
  const rows: string[] = [];
  for (const [name, items] of byCustomer) {
    const cvrNames = [...new Set(items.map((d) => d.coverageName))].slice(0, 3).join(", ");
    rows.push(`| ${name} | ${items[0].productName} | ${cvrNames} |`);
  }

  return `🔍 "${keyword}" 상품 가입 현황 (고객 ${customerSet.size}명, 증권 ${policySet.size}건)\n\n${[header, divider, ...rows].join("\n")}`;
}

function formatCoverageSearch(keyword: string): string {
  const details = searchByCoverageName(keyword);
  if (details.length === 0) {
    return `"${keyword}" 관련 담보 가입 내역을 찾을 수 없습니다.`;
  }

  const customerSet = new Set(details.map((d) => d.customerName));

  const byCustomer = new Map<string, CsvGoodsDetail[]>();
  for (const d of details) {
    const arr = byCustomer.get(d.customerName) ?? [];
    arr.push(d);
    byCustomer.set(d.customerName, arr);
  }

  const header = "| 고객명 | 상품명 | 담보명 | 보험기간 |";
  const divider = "|--------|--------|--------|----------|";
  const rows: string[] = [];
  for (const [name, items] of byCustomer) {
    const products = [...new Set(items.map((d) => d.productName))].join(", ");
    rows.push(`| ${name} | ${products} | ${items[0].coverageName} | ${formatDate(items[0].insuranceStart)}~${formatDate(items[0].insuranceEnd)} |`);
  }

  return `🔍 "${keyword}" 담보 가입 현황 (고객 ${customerSet.size}명, 담보 ${details.length}건)\n\n${[header, divider, ...rows].join("\n")}`;
}

// ─── Route Handler ───────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { intent, targetName, fpName, params } = (await req.json()) as QueryCsvRequest;
    const fp = fpName ?? undefined;

    let text: string;

    switch (intent) {
      case "fp_list":
        text = formatFPList();
        break;
      case "fp_customers":
        text = targetName
          ? formatFPCustomers(targetName)
          : formatFPList();
        break;
      case "my_customers":
        text = formatMyCustomers(targetName ?? "");
        break;
      case "csv_gender_filter":
        if (params?.gender) {
          // 성별 필터 + 연령 복합 조건 지원
          let genderCustomers = getCustomersByGender(params.gender, fp);
          if (params?.ageMin != null || params?.ageMax != null) {
            const ageMin = params.ageMin ?? 0;
            const ageMax = params.ageMax ?? 999;
            genderCustomers = genderCustomers.filter((c) => {
              const age = calculateAge(c.birthYear);
              return age >= ageMin && age < ageMax;
            });
          }
          const label = params.gender === "남" ? "남성" : "여성";
          const ageLabel = (params?.ageMin != null || params?.ageMax != null)
            ? ` ${params.ageMin ?? 0}~${(params.ageMax ?? 999) < 999 ? params.ageMax + "세" : "세 이상"}`
            : "";
          text = genderCustomers.length === 0
            ? `${label}${ageLabel} 고객이 없습니다.`
            : `👤 ${label}${ageLabel} 고객 (${genderCustomers.length}명)\n\n${customerTable(genderCustomers)}`;
        } else {
          text = "성별을 지정해주세요. (예: \"남자 고객\", \"여자 고객\")";
        }
        break;
      case "csv_age_filter": {
        let ageCustomers = getCustomersByAge(params?.ageMin ?? 0, params?.ageMax ?? 999, fp);
        // 성별 복합 조건 지원
        if (params?.gender) {
          const g = params.gender === "남" || params.gender === "M" ? "M" : "F";
          ageCustomers = ageCustomers.filter((c) => c.gender === g);
        }
        const ageMin = params?.ageMin ?? 0;
        const ageMax = params?.ageMax ?? 999;
        const ageLbl = ageMax < 999 ? `${ageMin}~${ageMax}세` : `${ageMin}세 이상`;
        const genderLbl = params?.gender ? (params.gender === "남" ? " 남성" : " 여성") : "";
        text = ageCustomers.length === 0
          ? `${ageLbl}${genderLbl} 고객이 없습니다.`
          : `👤 ${ageLbl}${genderLbl} 고객 (${ageCustomers.length}명)\n\n${customerTable(ageCustomers)}`;
        break;
      }
      case "workplace_search":
        text = params?.keyword
          ? formatWorkplaceSearch(params.keyword, fp)
          : "직장명을 입력해주세요. (예: \"삼성전자 고객\")";
        break;
      case "marketing_consent":
        text = formatMarketingConsent(fp);
        break;
      case "csv_birth_month":
        text = formatBirthMonthCustomers(params?.month ?? undefined, fp);
        break;
      case "product_ranking":
        text = formatProductRanking();
        break;
      case "product_list":
        text = formatProductList();
        break;
      case "customer_coverage":
        text = targetName
          ? formatCustomerCoverage(targetName)
          : "고객명을 입력해주세요. (예: \"고한준 가입 담보\")";
        break;
      case "expiry_coverage":
        text = formatExpiryCoverage(params?.months ?? 12);
        break;
      case "product_search":
        text = params?.keyword
          ? formatProductSearch(params.keyword)
          : "검색할 상품명을 입력해주세요. (예: \"암보험 가입 현황\")";
        break;
      case "coverage_search":
        text = params?.keyword
          ? formatCoverageSearch(params.keyword)
          : "검색할 담보명을 입력해주세요. (예: \"사망보험금 가입자\")";
        break;
      default:
        text = "지원하지 않는 조회 유형입니다.";
    }

    return NextResponse.json({ text });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[query-csv] Error:", message);
    return NextResponse.json(
      { text: `데이터 조회 중 오류가 발생했습니다: ${message}` },
      { status: 500 }
    );
  }
}
