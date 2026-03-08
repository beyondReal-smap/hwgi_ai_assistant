import fs from "fs";
import path from "path";
import { parseCsvLine, toYmd, fuzzyScore } from "./csv-utils";

// ─── Types ───────────────────────────────────────────────

export interface CsvFP {
  name: string;
  staffNo: string;
}

export interface CsvCustomer {
  orgName: string;
  fpName: string;
  customerName: string;
  customerRrn: string;
  birthYear: number;
  birthMndy: string;        // MMDD
  marketingConsent: string;  // Y/N
  jobCode: string;
  gender: string;            // 01=남, 02=여
  workplace: string;
}

export interface CsvGoodsDetail {
  orgName: string;
  fpName: string;
  customerName: string;
  customerRrn: string;
  policyNo: string;
  productCode: string;
  insImcd: string;
  insuranceStart: string;
  insuranceEnd: string;
  coverageCode: string;  // CVRCD
  productName: string;   // GDNM
  coverageName: string;  // CVRNM
}

export interface CsvCoverage {
  orgName: string;
  fpName: string;
  customerName: string;
  customerRrn: string;
  policyNo: string;
  productCode: string;
  coverageCode: string;
  insuranceStart: string;
  insuranceEnd: string;
}

export interface CsvCoverageWithProduct extends CsvCoverage {
  productName: string;
  coverageName: string;
}

// ─── CSV Parsing ─────────────────────────────────────────

function loadCsv(filename: string): string[][] {
  const filePath = path.join(process.cwd(), "lib", "data", filename);
  const raw = fs.readFileSync(filePath, "utf-8").replace(/^\uFEFF/, "").trim();
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];
  return lines.slice(1).map(parseCsvLine);
}

// ─── Load Data ───────────────────────────────────────────

const fpRows = loadCsv("fp.csv");
const customerRows = loadCsv("customer.csv");
const goodsRows = loadCsv("goods.csv");
const cvrRows = loadCsv("cvr.csv");

// fp.csv: ORGNM, NM, STFNO, ...
const FP_LIST: CsvFP[] = fpRows.map((r) => ({
  name: r[1],
  staffNo: r[2],
}));

// customer.csv: ORGNM,NM,RSNO,NTRDT,STF_FLGCD,STF_BZ_STCD,계약자명,계약자주민번호,BORN_YR,BORN_MNDY,MKTG_TL_RCV_YN,JBCD,SEXCD,WPCNM
const CUSTOMER_LIST: CsvCustomer[] = customerRows.map((r) => ({
  orgName: r[0],
  fpName: r[1],
  customerName: r[6],
  customerRrn: r[7],
  birthYear: parseInt(r[8], 10) || 0,
  birthMndy: r[9] ?? "",
  marketingConsent: r[10] ?? "",
  jobCode: r[11] ?? "",
  gender: r[12] ?? "",
  workplace: r[13] ?? "",
}));

// goods.csv (집계형): ORGNM,GDCD,GDNM,CNT
interface GoodsAggregated { productCode: string; productName: string; count: number }
const GOODS_AGGREGATED: GoodsAggregated[] = goodsRows.map((r) => ({
  productCode: r[1] ?? "",
  productName: r[2] ?? "",
  count: parseInt(r[3], 10) || 0,
}));

// cvr.csv (상세형): NM,HNGL_RELNM,CTM_DSCNO,PLYNO,GDCD,INS_IMCD,INS_ST,INS_CLSTR,CVRCD,GDNM,CVRNM
const GOODS_DETAIL_LIST: CsvGoodsDetail[] = cvrRows.map((r) => ({
  orgName: "",
  fpName: r[0],
  customerName: r[1],
  customerRrn: r[2],
  policyNo: r[3],
  productCode: r[4],
  insImcd: r[5],
  insuranceStart: toYmd(r[6]),
  insuranceEnd: toYmd(r[7]),
  coverageCode: r[8],
  productName: r[9],
  coverageName: r[10],
}));

// 상품명 맵 구축 (GDCD → GDNM)
const goodsNameMap = new Map<string, string>();
for (const g of GOODS_DETAIL_LIST) {
  if (!goodsNameMap.has(g.productCode)) {
    goodsNameMap.set(g.productCode, g.productName);
  }
}

// 담보명 맵 구축 (CVRCD → CVRNM)
const cvrNameMap = new Map<string, string>();
for (const g of GOODS_DETAIL_LIST) {
  if (!cvrNameMap.has(g.coverageCode)) {
    cvrNameMap.set(g.coverageCode, g.coverageName);
  }
}

const COVERAGE_LIST: CsvCoverage[] = cvrRows.map((r) => ({
  orgName: "",
  fpName: r[0],
  customerName: r[1],
  customerRrn: r[2],
  policyNo: r[3],
  productCode: r[4],
  coverageCode: r[8],
  insuranceStart: toYmd(r[6]),
  insuranceEnd: toYmd(r[7]),
}));

// ─── Fuzzy Search ────────────────────────────────────────

const FUZZY_THRESHOLD = 0.6;

// 고유 상품명 / 담보명 인덱스 (로드 시 1회 구축)
const UNIQUE_PRODUCT_NAMES = [...new Set(GOODS_DETAIL_LIST.map((g) => g.productName).filter(Boolean))];
const UNIQUE_COVERAGE_NAMES = [...new Set(GOODS_DETAIL_LIST.map((g) => g.coverageName).filter(Boolean))];

// ─── Helpers ─────────────────────────────────────────────

function formatDate(yyyymmdd: string): string {
  if (!yyyymmdd || yyyymmdd.length !== 8) return yyyymmdd;
  return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;
}

function calculateAge(birthYear: number): number {
  return new Date().getFullYear() - birthYear;
}

function genderLabel(sexcd: string): string {
  return sexcd === "01" ? "남" : sexcd === "02" ? "여" : sexcd;
}

// ─── Query Functions ─────────────────────────────────────

export function getFPList(): CsvFP[] {
  return FP_LIST;
}

export function getCustomersByFP(fpName: string): CsvCustomer[] {
  return CUSTOMER_LIST.filter((c) => c.fpName === fpName);
}

export function getAllCustomers(): CsvCustomer[] {
  return CUSTOMER_LIST;
}

// FP 이름으로 기본 필터링 (fpName 제공 시 해당 FP 고객만)
function filterByFP(list: CsvCustomer[], fpName?: string): CsvCustomer[] {
  if (!fpName) return list;
  return list.filter((c) => c.fpName === fpName);
}

// 성별 필터
export function getCustomersByGender(gender: string, fpName?: string): CsvCustomer[] {
  const sexcd = gender === "남" ? "01" : gender === "여" ? "02" : gender;
  return filterByFP(CUSTOMER_LIST, fpName).filter((c) => c.gender === sexcd);
}

// 연령대 필터
export function getCustomersByAge(ageMin: number, ageMax: number, fpName?: string): CsvCustomer[] {
  return filterByFP(CUSTOMER_LIST, fpName).filter((c) => {
    const age = calculateAge(c.birthYear);
    return age >= ageMin && age <= ageMax;
  });
}

// 직장명 검색
export function getCustomersByWorkplace(keyword: string, fpName?: string): CsvCustomer[] {
  return filterByFP(CUSTOMER_LIST, fpName).filter((c) => c.workplace && c.workplace.includes(keyword));
}

// 마케팅 동의 고객
export function getCustomersWithMarketingConsent(fpName?: string): CsvCustomer[] {
  return filterByFP(CUSTOMER_LIST, fpName).filter((c) => c.marketingConsent === "Y");
}

// 생일 고객 (이번 달 또는 특정 월)
export function getCustomersByBirthMonth(month?: number, fpName?: string): CsvCustomer[] {
  const targetMonth = month ?? (new Date().getMonth() + 1);
  const monthStr = targetMonth.toString().padStart(2, "0");
  return filterByFP(CUSTOMER_LIST, fpName).filter((c) => c.birthMndy.startsWith(monthStr));
}

// 상품별 가입 건수 (goods.csv 집계 데이터 사용)
export function getProductRanking(): { productCode: string; productName: string; count: number }[] {
  return [...GOODS_AGGREGATED].sort((a, b) => b.count - a.count);
}

// 전체 상품 목록
export function getProductList(): { productCode: string; productName: string; count: number }[] {
  return getProductRanking();
}

// 고객별 가입상품 상세 (goods 데이터 기반 — 상품명/담보명 포함)
export function getGoodsDetailByCustomer(customerName: string): CsvGoodsDetail[] {
  return GOODS_DETAIL_LIST.filter((g) => g.customerName === customerName);
}

// 고객별 가입담보 (cvr 데이터 + 이름 조인)
export function getCoveragesByCustomer(customerName: string): CsvCoverageWithProduct[] {
  return COVERAGE_LIST
    .filter((c) => c.customerName === customerName)
    .map((c) => ({
      ...c,
      productName: goodsNameMap.get(c.productCode) ?? c.productCode,
      coverageName: cvrNameMap.get(c.coverageCode) ?? c.coverageCode,
    }));
}

// 고객별 증권 목록 (중복 제거)
export function getCustomerProducts(customerName: string): { productCode: string; productName: string; policyNo: string; start: string; end: string }[] {
  const details = getGoodsDetailByCustomer(customerName);
  const policyMap = new Map<string, { productCode: string; productName: string; policyNo: string; start: string; end: string }>();
  for (const d of details) {
    if (!policyMap.has(d.policyNo)) {
      policyMap.set(d.policyNo, {
        productCode: d.productCode,
        productName: d.productName,
        policyNo: d.policyNo,
        start: formatDate(d.insuranceStart),
        end: formatDate(d.insuranceEnd),
      });
    }
  }
  return Array.from(policyMap.values());
}

// 만기 도래 담보
export function getCoveragesExpiringSoon(months: number): CsvCoverageWithProduct[] {
  const now = new Date();
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() + months);

  const nowStr = now.toISOString().slice(0, 10).replace(/-/g, "");
  const cutoffStr = cutoff.toISOString().slice(0, 10).replace(/-/g, "");

  return COVERAGE_LIST
    .filter((c) => c.insuranceEnd >= nowStr && c.insuranceEnd <= cutoffStr)
    .map((c) => ({
      ...c,
      productName: goodsNameMap.get(c.productCode) ?? c.productCode,
      coverageName: cvrNameMap.get(c.coverageCode) ?? c.coverageCode,
    }))
    .sort((a, b) =>
      a.customerName.localeCompare(b.customerName, "ko")
      || a.productName.localeCompare(b.productName, "ko")
      || a.policyNo.localeCompare(b.policyNo)
      || a.coverageName.localeCompare(b.coverageName, "ko")
    );
}

// 상품명 퍼지 검색 (바이그램 인덱스 기반)
export function searchByProductName(keyword: string): CsvGoodsDetail[] {
  if (!keyword) return [];
  const matched = new Set<string>();
  for (const name of UNIQUE_PRODUCT_NAMES) {
    if (fuzzyScore(keyword, name) >= FUZZY_THRESHOLD) matched.add(name);
  }
  if (matched.size === 0) return [];
  return GOODS_DETAIL_LIST.filter((g) => matched.has(g.productName));
}

// 담보명 퍼지 검색 (바이그램 인덱스 기반)
export function searchByCoverageName(keyword: string): CsvGoodsDetail[] {
  if (!keyword) return [];
  const matched = new Set<string>();
  for (const name of UNIQUE_COVERAGE_NAMES) {
    if (fuzzyScore(keyword, name) >= FUZZY_THRESHOLD) matched.add(name);
  }
  if (matched.size === 0) return [];
  return GOODS_DETAIL_LIST.filter((g) => matched.has(g.coverageName));
}

export { formatDate, calculateAge, genderLabel };
