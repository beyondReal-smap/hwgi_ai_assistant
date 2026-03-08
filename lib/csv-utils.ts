/**
 * Shared CSV parsing utilities.
 */

/** RFC-4180 compliant CSV line parser (handles quoted fields). */
export function parseCsvLine(line: string): string[] {
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

/** "2024-04-05 00:00:00.0" -> "20240405", already YYYYMMDD -> as-is */
export function toYmd(raw: string): string {
  if (!raw) return "";
  const d = raw.trim().slice(0, 10); // "2024-04-05" or "20240405"
  return d.replace(/-/g, "");
}

/** Generate bigrams (2-char sliding window) from a string */
function makeBigrams(s: string): string[] {
  const n = s.replace(/\s+/g, "");
  const out: string[] = [];
  for (let i = 0; i < n.length - 1; i++) out.push(n.slice(i, i + 2));
  return out;
}

/** Fuzzy matching score (0~1): how well keyword matches target */
export function fuzzyScore(keyword: string, target: string): number {
  const kw = keyword.replace(/\s+/g, "");
  const tg = target.replace(/\s+/g, "");
  if (tg.includes(kw)) return 1.0;
  const bgs = makeBigrams(kw);
  if (bgs.length === 0) return 0;
  let hit = 0;
  for (const bg of bgs) if (tg.includes(bg)) hit++;
  return hit / bgs.length;
}
