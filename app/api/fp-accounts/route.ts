import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import { parseCsvLine } from "@/lib/csv-utils";

interface AccountRow {
  name: string;
  employeeId: string;
  password: string;
  branch: string;
  level: string;
  yearsOfExperience: number;
  phone: string | undefined;
  email: string | undefined;
  profileInitials: string;
}

function calcYears(ntrdt: string): number {
  const match = ntrdt.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return 0;
  const entryYear = parseInt(match[1], 10);
  return Math.max(0, new Date().getFullYear() - entryYear);
}

let cachedAccounts: AccountRow[] | null = null;

function loadAccounts(): AccountRow[] {
  const csvPath = path.join(process.cwd(), "lib", "data", "fp.csv");
  const raw = fs.readFileSync(csvPath, "utf-8").replace(/^\uFEFF/, "").trim();
  const lines = raw.split(/\r?\n/).filter((l) => l.trim());

  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
  const idx = {
    orgnm: headers.indexOf("orgnm"),
    nm: headers.indexOf("nm"),
    stfno: headers.indexOf("stfno"),
    ntrdt: headers.indexOf("ntrdt"),
    password: headers.indexOf("password"),
  };

  if (idx.nm < 0 || idx.stfno < 0 || idx.password < 0) return [];

  const accounts: AccountRow[] = [];
  const seen = new Set<string>();

  for (let i = 1; i < lines.length; i++) {
    const vals = parseCsvLine(lines[i]);
    const name = (vals[idx.nm] ?? "").trim();
    const employeeId = (vals[idx.stfno] ?? "").trim();
    const password = (vals[idx.password] ?? "").trim();

    if (!name || !employeeId || !password) continue;
    if (seen.has(employeeId)) continue;
    seen.add(employeeId);

    const branch = idx.orgnm >= 0 ? (vals[idx.orgnm] ?? "").trim() || "미지정" : "미지정";
    const yearsOfExperience = idx.ntrdt >= 0 ? calcYears(vals[idx.ntrdt] ?? "") : 0;

    accounts.push({
      name,
      employeeId,
      password,
      branch,
      level: "FP",
      yearsOfExperience,
      phone: undefined,
      email: undefined,
      profileInitials: name.charAt(0) || "F",
    });
  }

  return accounts;
}

function getAccounts(): AccountRow[] {
  if (!cachedAccounts) {
    cachedAccounts = loadAccounts();
  }
  return cachedAccounts;
}

/** GET: returns accounts WITHOUT passwords (for session restore & listing) */
export async function GET() {
  try {
    const accounts = getAccounts();
    const safeAccounts = accounts.map(({ password: _, ...rest }) => rest);
    return NextResponse.json({ accounts: safeAccounts, count: safeAccounts.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ accounts: [], count: 0, error: msg }, { status: 500 });
  }
}

/** POST: server-side authentication with bcrypt */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const employeeId = typeof body.employeeId === "string" ? body.employeeId.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!employeeId || !password) {
      return NextResponse.json(
        { error: "사번과 비밀번호를 입력해주세요." },
        { status: 400 }
      );
    }

    const accounts = getAccounts();
    const account = accounts.find((a) => a.employeeId === employeeId);

    if (!account) {
      return NextResponse.json(
        { error: "사번 또는 비밀번호가 올바르지 않습니다." },
        { status: 401 }
      );
    }

    const isValid = await bcrypt.compare(password, account.password);
    if (!isValid) {
      return NextResponse.json(
        { error: "사번 또는 비밀번호가 올바르지 않습니다." },
        { status: 401 }
      );
    }

    const { password: _, ...profile } = account;
    return NextResponse.json({ profile });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[fp-accounts] Auth error:", msg);
    return NextResponse.json(
      { error: "인증 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
