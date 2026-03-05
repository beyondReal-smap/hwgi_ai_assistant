import fs from "fs";
import path from "path";
import type { Customer, EventType, Gender, UrgencyLevel } from "@/lib/types";

// ─── ESSN_TOU_TPCD Mappings ────────────────────────────

const TOUCH_TYPE_MAP: Record<string, EventType> = {
  A0001: "장기 연체(미납)",
  A0002: "장기 실효(해지)",
  A0003: "장기 해약",
  A0004: "장기계약 부활",
  A0005: "보험금 지급",
  A0006: "장기 갱신",
  A0007: "장기 납입만기(완납)",
  A0008: "장기 만기 도래",
  A0009: "자동차 만기 도래",
  A0010: "장기 체결 감사",
  A0011: "고객정보 수정",
  A0012: "우편물 반송",
  A0013: "장기 자동이체 미인출",
  A0014: "미래보장담보 개시 도래",
  B0001: "본인 생일",
  B0002: "자녀 입학",
  B0003: "휴면보험금 안내",
  B0004: "자보 이탈고객 만기 안내",
  B0005: "타사 자보만기(장기고객)",
  B0006: "상령월 도래",
  B0007: "가입설계동의 만료",
  B0008: "가망고객정보 삭제",
  B0009: "장기 미터치 이관고객 안내",
  B0010: "주요담보 저가입고객 안내",
  C0001: "미터치고객",
  C0002: "담보 부족고객",
  C0003: "상품추가 가입고객",
  C0004: "미가입 가망고객",
};

const URGENCY_MAP: Record<string, UrgencyLevel> = {
  A0001: "urgent",  // 장기 연체(미납)
  A0002: "urgent",  // 장기 실효(해지)
  A0003: "urgent",  // 장기 해약
  A0009: "urgent",  // 자동차 만기 도래
  A0013: "urgent",  // 장기 자동이체 미인출
  A0006: "high",    // 장기 갱신
  A0008: "high",    // 장기 만기 도래
  B0007: "high",    // 가입설계동의 만료
  A0014: "high",    // 미래보장담보 개시 도래
  A0004: "normal",  // 장기계약 부활
  A0005: "normal",  // 보험금 지급
  A0010: "normal",  // 장기 체결 감사
  B0001: "normal",  // 본인 생일
  B0002: "normal",  // 자녀 입학
  B0003: "normal",  // 휴면보험금 안내
  B0004: "normal",  // 자보 이탈고객 만기 안내
  B0005: "normal",  // 타사 자보만기(장기고객)
  B0006: "normal",  // 상령월 도래
  B0010: "normal",  // 주요담보 저가입고객 안내
  C0001: "normal",  // 미터치고객
  C0002: "normal",  // 담보 부족고객
  C0003: "normal",  // 상품추가 가입고객
  C0004: "normal",  // 미가입 가망고객
  B0009: "normal",  // 장기 미터치 이관고객 안내
  A0007: "low",     // 장기 납입만기(완납)
  A0011: "low",     // 고객정보 수정
  A0012: "low",     // 우편물 반송
  B0008: "low",     // 가망고객정보 삭제
};

// 이벤트 상세 설명 생성용
const EVENT_DETAIL_MAP: Record<string, string> = {
  A0001: "장기보험 보험료가 연체/미납 상태입니다. 빠른 안내가 필요합니다.",
  A0002: "장기보험 계약이 실효(해지) 처리되었습니다.",
  A0003: "장기보험 해약 요청이 접수되었습니다.",
  A0004: "실효된 장기보험 계약의 부활이 가능합니다.",
  A0005: "보험금 지급이 완료되었습니다. 감사 연락이 필요합니다.",
  A0006: "장기보험 갱신 시기가 도래했습니다.",
  A0007: "장기보험 납입이 완납되었습니다.",
  A0008: "장기보험 만기가 도래합니다.",
  A0009: "자동차보험 만기가 도래합니다. 갱신 안내가 필요합니다.",
  A0010: "장기보험 체결에 감사 인사가 필요합니다.",
  A0011: "고객 정보가 수정되었습니다. 확인이 필요합니다.",
  A0012: "우편물이 반송되었습니다. 주소 확인이 필요합니다.",
  A0013: "장기보험 자동이체가 미인출 상태입니다.",
  A0014: "미래보장담보 개시일이 도래합니다.",
  B0001: "오늘 생일입니다. 축하 메시지를 보내세요.",
  B0002: "자녀 입학 시기입니다. 축하/안내 연락이 필요합니다.",
  B0003: "휴면 보험금이 있습니다. 안내가 필요합니다.",
  B0004: "자동차보험 이탈 고객의 만기가 도래합니다.",
  B0005: "타사 자동차보험 만기 도래 (장기보험 고객)입니다.",
  B0006: "상령월(보험 나이 변경월)이 도래합니다.",
  B0007: "가입설계 동의가 만료 예정입니다. 연장 안내가 필요합니다.",
  B0008: "가망고객 정보 삭제 예정입니다.",
  B0009: "장기 미터치 이관고객입니다. 관계 구축이 필요합니다.",
  B0010: "주요 담보가 저가입 상태입니다. 담보 보강을 제안하세요.",
  C0001: "장기간 연락이 없는 고객입니다. 관계 재구축이 필요합니다.",
  C0002: "보장 분석 결과 담보가 부족합니다.",
  C0003: "추가 상품 가입이 가능한 고객입니다.",
  C0004: "아직 가입하지 않은 가망고객입니다.",
};

// ─── CSV Parsing ────────────────────────────────────────

interface DailyTouchRow {
  trgtInqdt: string;
  stfno: string;
  essnTouTpcd: string;
  essnTouTpSeqno: string;
  etIt1: string;
  etIt2: string;
  etIt3: string;
  carno: string;
  ctmno: string;
  customerName: string;
  sexcd: string;
  age: number;
  bornYear: number;
  bornMndy: string;
  fmlBornYear: string;
  fmlBornMndy: string;
  ltrmIsCt: number;
  crIsCt: number;
  hpTlano: string;
  hpTltno: string;
  isPlanAgreDt: string;
  ctmTouDt: string;
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    const next = line[i + 1];

    if (ch === '"' && inQuotes && next === '"') {
      current += '"';
      i += 1;
      continue;
    }
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === "," && !inQuotes) {
      out.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }

  out.push(current.trim());
  return out;
}

function loadDailyTouchCsv(): DailyTouchRow[] {
  const filePath = path.join(process.cwd(), "lib", "data", "daily_touch.csv");
  const raw = fs.readFileSync(filePath, "utf-8").replace(/^\uFEFF/, "").trim();
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  return lines.slice(1).map((line) => {
    const r = parseCsvLine(line);
    return {
      trgtInqdt: r[0] ?? "",
      stfno: r[1] ?? "",
      essnTouTpcd: r[4] ?? "",
      essnTouTpSeqno: r[5] ?? "",
      etIt1: r[6] ?? "",
      etIt2: r[7] ?? "",
      etIt3: r[8] ?? "",
      carno: r[9] ?? "",
      ctmno: r[10] ?? "",
      customerName: r[11] ?? "",
      sexcd: r[12] ?? "",
      age: parseInt(r[13], 10) || 0,
      bornYear: parseInt(r[14], 10) || 0,
      bornMndy: r[15] ?? "",
      fmlBornYear: r[16] ?? "",
      fmlBornMndy: r[17] ?? "",
      ltrmIsCt: parseInt(r[18], 10) || 0,
      crIsCt: parseInt(r[19], 10) || 0,
      hpTlano: r[20] ?? "",
      hpTltno: r[21] ?? "",
      isPlanAgreDt: r[23] ?? "",
      ctmTouDt: r[24] ?? "",
    };
  });
}

// ─── Data Loading ───────────────────────────────────────

const ALL_TOUCH_ROWS = loadDailyTouchCsv();

// ─── Conversion ─────────────────────────────────────────

function formatDateStr(yyyymmdd: string): string {
  if (!yyyymmdd || yyyymmdd.length !== 8) return "";
  return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;
}

function parseTimestamp(ts: string): string {
  // "2026-03-03 00:00:00.0" → "2026-03-03"
  if (!ts) return "";
  return ts.slice(0, 10);
}

function buildEventDetail(row: DailyTouchRow): string {
  const base = EVENT_DETAIL_MAP[row.essnTouTpcd] ?? row.essnTouTpcd;
  const parts: string[] = [base];

  if (row.etIt1) {
    // ET_IT_1 은 증권번호 또는 날짜일 수 있음
    if (row.etIt1.startsWith("CA") || row.etIt1.startsWith("LA")) {
      parts.push(`증권: ${row.etIt1}`);
    } else if (/^\d{8}$/.test(row.etIt1)) {
      parts.push(`일자: ${formatDateStr(row.etIt1)}`);
    }
  }

  if (row.etIt2 && /^\d{8}$/.test(row.etIt2)) {
    parts.push(`관련일: ${formatDateStr(row.etIt2)}`);
  }

  return parts.join("\n");
}

function touchRowToCustomer(row: DailyTouchRow): Customer {
  const gender: Gender = row.sexcd === "M" ? "남" : "여";
  const birthMm = row.bornMndy.padStart(4, "0").slice(0, 2);
  const birthDd = row.bornMndy.padStart(4, "0").slice(2, 4);
  const birthDate = row.bornYear
    ? `${row.bornYear}-${birthMm}-${birthDd}`
    : "";

  const phone = row.hpTlano && row.hpTltno
    ? `${row.hpTlano}-${row.hpTltno}-****`
    : undefined;

  const event = TOUCH_TYPE_MAP[row.essnTouTpcd] ?? ("미터치고객" as EventType);
  const urgency = URGENCY_MAP[row.essnTouTpcd] ?? "normal";

  // lastContact: CTM_TOU_DT 또는 null
  let lastContact: string | null = null;
  if (row.ctmTouDt) {
    lastContact = parseTimestamp(row.ctmTouDt);
  }

  // eventDate: ET_IT_2 날짜 또는 TRGT_INQDT
  let eventDate: string | undefined;
  if (row.etIt2 && /^\d{8}$/.test(row.etIt2)) {
    eventDate = formatDateStr(row.etIt2);
  } else if (row.trgtInqdt) {
    eventDate = parseTimestamp(row.trgtInqdt);
  }

  return {
    id: `dt-${row.ctmno}-${row.essnTouTpcd}`,
    name: row.customerName,
    gender,
    age: row.age,
    birthDate,
    phone,
    event,
    eventDetail: buildEventDetail(row),
    eventDate,
    products: [],
    urgency,
    lastContact,
    contactHistory: [],
    longTermCount: row.ltrmIsCt,
    carCount: row.crIsCt,
  };
}

// ─── Exports ────────────────────────────────────────────

export function getDailyTouchByStfno(stfno: string): Customer[] {
  return ALL_TOUCH_ROWS
    .filter((row) => row.stfno === stfno)
    .map(touchRowToCustomer);
}

export function getAllDailyTouchCustomers(): Customer[] {
  return ALL_TOUCH_ROWS.map(touchRowToCustomer);
}

export function getDailyTouchStfnoList(): string[] {
  return [...new Set(ALL_TOUCH_ROWS.map((r) => r.stfno))];
}

export function getDailyTouchCount(stfno: string): number {
  return ALL_TOUCH_ROWS.filter((r) => r.stfno === stfno).length;
}

export { TOUCH_TYPE_MAP, URGENCY_MAP };
