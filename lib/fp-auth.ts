import type { FPAccount, FPProfile } from "./types";

const HEADER_ALIASES = {
  name: ["name", "fp_name", "fp", "이름", "성명", "설계사명", "fp명"],
  employeeId: ["employeeid", "employee_id", "id", "사번", "fp코드", "코드", "fpid"],
  password: ["password", "pwd", "pass", "pw", "비밀번호"],
  branch: ["branch", "지점", "소속지점", "조직"],
  level: ["level", "등급", "직급", "fp레벨"],
  yearsOfExperience: [
    "yearsofexperience",
    "years_of_experience",
    "experience",
    "years",
    "경력",
    "경력년수",
  ],
  phone: ["phone", "mobile", "휴대전화", "휴대전화번호", "연락처"],
  email: ["email", "이메일", "메일"],
  profileInitials: ["profileinitials", "initials", "이니셜"],
} as const;

type CanonicalHeader = keyof typeof HEADER_ALIASES;

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "");
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
  return out.map((v) => (v.startsWith('"') && v.endsWith('"') ? v.slice(1, -1) : v));
}

function detectHeaderIndexes(headers: string[]): Partial<Record<CanonicalHeader, number>> {
  const normalizedHeaders = headers.map(normalizeHeader);
  const result: Partial<Record<CanonicalHeader, number>> = {};

  (Object.keys(HEADER_ALIASES) as CanonicalHeader[]).forEach((canonicalKey) => {
    const aliases = HEADER_ALIASES[canonicalKey];
    const hitIndex = normalizedHeaders.findIndex((header) =>
      aliases.some((alias) => normalizeHeader(alias) === header)
    );
    if (hitIndex >= 0) {
      result[canonicalKey] = hitIndex;
    }
  });

  return result;
}

function toInteger(value: string, fallback = 0) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function parseFPAccountsCsv(csvText: string): {
  accounts: FPAccount[];
  parseError?: string;
} {
  const normalized = csvText.replace(/^\uFEFF/, "").trim();
  if (!normalized) {
    return { accounts: [], parseError: "FP.csv 파일이 비어 있습니다." };
  }

  const lines = normalized
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length < 2) {
    return { accounts: [], parseError: "FP.csv에 헤더와 데이터 행이 필요합니다." };
  }

  const headers = parseCsvLine(lines[0]);
  const headerIndexes = detectHeaderIndexes(headers);
  const required: CanonicalHeader[] = ["name", "employeeId", "password"];
  const missingRequired = required.filter((key) => headerIndexes[key] === undefined);

  if (missingRequired.length > 0) {
    return {
      accounts: [],
      parseError: `FP.csv 헤더가 부족합니다: ${missingRequired.join(", ")}`,
    };
  }

  const accounts: FPAccount[] = [];
  const duplicateCheck = new Set<string>();
  const nameIdx = headerIndexes.name as number;
  const employeeIdIdx = headerIndexes.employeeId as number;
  const passwordIdx = headerIndexes.password as number;

  for (let row = 1; row < lines.length; row += 1) {
    const values = parseCsvLine(lines[row]);
    const name = (values[nameIdx] ?? "").trim();
    const employeeId = (values[employeeIdIdx] ?? "").trim();
    const password = (values[passwordIdx] ?? "").trim();

    if (!name && !employeeId && !password) {
      continue;
    }

    if (!name || !employeeId || !password) {
      continue;
    }

    if (duplicateCheck.has(employeeId)) {
      continue;
    }
    duplicateCheck.add(employeeId);

    const branch = (values[headerIndexes.branch ?? -1] ?? "").trim() || "미지정";
    const level = (values[headerIndexes.level ?? -1] ?? "").trim() || "FP";
    const yearsOfExperience = toInteger(values[headerIndexes.yearsOfExperience ?? -1] ?? "", 0);
    const phone = (values[headerIndexes.phone ?? -1] ?? "").trim() || undefined;
    const email = (values[headerIndexes.email ?? -1] ?? "").trim() || undefined;
    const profileInitials =
      (values[headerIndexes.profileInitials ?? -1] ?? "").trim() ||
      name.charAt(0) ||
      "F";

    accounts.push({
      name,
      employeeId,
      password,
      branch,
      level,
      yearsOfExperience,
      phone,
      email,
      profileInitials,
    });
  }

  if (accounts.length === 0) {
    return {
      accounts: [],
      parseError:
        "로그인 가능한 FP 데이터가 없습니다. name, employeeId, password 값을 확인해 주세요.",
    };
  }

  return { accounts };
}

export function authenticateFP(
  accounts: FPAccount[],
  employeeId: string,
  password: string
): FPProfile | null {
  const hit = accounts.find(
    (account) =>
      account.employeeId === employeeId.trim() && account.password === password
  );

  if (!hit) return null;

  const { password: _, ...profile } = hit;
  return profile;
}
