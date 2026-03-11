import type { SilsonSearchResponse } from "@/lib/silson-types";
import type { SilsonCardTone } from "@/lib/types";

export interface SilsonCardSpec {
  title: string;
  content: string;
  badge?: string;
  tone: SilsonCardTone;
  sources?: string[];
  followUps?: string[];
}

/* ── helpers ──────────────────────────────────────────────── */

function dedupeLines(items: Array<string | null | undefined>, limit = 5): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    const v = item?.trim();
    if (!v || seen.has(v)) continue;
    seen.add(v);
    out.push(v);
    if (out.length >= limit) break;
  }
  return out;
}

function formatSourceLabels(data: SilsonSearchResponse): string[] {
  const labels: string[] = [];
  const seen = new Set<string>();
  for (const chunk of data.chunks) {
    const topic = chunk.clause_name || chunk.coverage_name || chunk.source_label || "관련 기준";
    const parts = [chunk.generation, chunk.product_alias, topic].filter(Boolean);
    const label = parts.join(" | ");
    if (label && !seen.has(label)) {
      seen.add(label);
      labels.push(label);
    }
  }
  if (labels.length > 0) return labels.slice(0, 5);
  return data.sources
    .map((s) => s.replace(/\.md\b/gi, "").trim())
    .filter(Boolean)
    .slice(0, 5);
}

function cleanMarkdown(text: string): string {
  return text
    .replace(/\r/g, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/^---+\s*$/gm, "")
    .replace(/^참고(?:\s*문서|\s*자료)?\s*:\s*.*$/gim, "")
    .trim();
}

/* ── main builder ─────────────────────────────────────────── */

export function buildSilsonCards(
  query: string,
  data: SilsonSearchResponse,
): SilsonCardSpec[] {
  const sourceLabels = formatSourceLabels(data);
  const sa = data.structured_answer;
  const hasChunks = data.chunks.length > 0;
  const sections: string[] = [];

  // Meta tags
  const metaParts = [
    data.filters.generation ? `세대: ${data.filters.generation}` : null,
    data.filters.join_ym ? `가입시기: ${data.filters.join_ym}` : null,
  ].filter(Boolean);
  if (metaParts.length > 0) {
    sections.push(`🏷️ ${metaParts.join(" | ")}`);
  }
  const metaCount = sections.length;

  if (sa) {
    const summary = sa.summary?.trim();
    const contextNote = sa.context_note?.trim();
    const answer = sa.answer?.trim();
    const coveragePoints = dedupeLines(sa.coverage_points ?? [], 4);
    const cautions = dedupeLines(sa.cautions ?? [], 3);
    const checkpoints = dedupeLines(
      [...(sa.checkpoints ?? []), sa.reference_note].filter(Boolean),
      4,
    );

    if (summary) sections.push(`💡 핵심 요약\n${summary}`);

    if (contextNote || answer) {
      const detail = [contextNote, answer].filter(Boolean).join("\n\n");
      sections.push(`📝 상세 설명\n${detail}`);
    }

    if (coveragePoints.length > 0) {
      sections.push(
        `✅ 보상 포인트\n${coveragePoints.map((p) => `- ${p}`).join("\n")}`,
      );
    }

    if (cautions.length > 0) {
      sections.push(
        `⚠️ 주의할 점\n${cautions.map((c) => `- ${c}`).join("\n")}`,
      );
    }

    if (checkpoints.length > 0) {
      sections.push(
        `📌 상담 체크포인트\n${checkpoints.map((c) => `- ${c}`).join("\n")}`,
      );
    }
  }

  // Fallback: if structured answer produced nothing, use raw answer
  if (sections.length <= metaCount) {
    const cleaned = cleanMarkdown(data.answer);
    sections.push(
      cleaned ? `📝 답변\n${cleaned}` : "검색 결과를 찾지 못했습니다.",
    );
  }

  return [
    {
      title: "실손 AI 답변",
      badge: hasChunks ? "AI 답변" : "확인 필요",
      tone: hasChunks ? "answer" : "warning",
      content: sections.join("\n\n"),
      sources: sourceLabels,
      followUps: data.follow_ups?.length ? data.follow_ups : undefined,
    },
  ];
}
