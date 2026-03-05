import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

interface FPRow {
  orgnm: string;
  nm: string;
  stfno: string;
  ntrdt: string;
  password: string;
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    const next = line[i + 1];
    if (ch === '"' && inQuotes && next === '"') {
      current += '"';
      i++;
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

function calcYears(ntrdt: string): number {
  const match = ntrdt.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return 0;
  const entryYear = parseInt(match[1], 10);
  const now = new Date();
  return Math.max(0, now.getFullYear() - entryYear);
}

let cachedAccounts: ReturnType<typeof loadAccounts> | null = null;

function loadAccounts() {
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

  const accounts = [];
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

export async function GET() {
  try {
    if (!cachedAccounts) {
      cachedAccounts = loadAccounts();
    }
    return NextResponse.json({ accounts: cachedAccounts, count: cachedAccounts.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ accounts: [], count: 0, error: msg }, { status: 500 });
  }
}
