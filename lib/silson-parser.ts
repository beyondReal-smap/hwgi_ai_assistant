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

function cleanSilsonMarkdown(text: string) {
  return text
    .replace(/\r/g, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/^참고(?:\s*문서|\s*자료)?\s*:\s*.*$/gim, "")
    .replace(/^---+\s*$/gm, "")
    .trim();
}

function trimSilsonHeading(line: string) {
  return cleanSilsonMarkdown(line)
    .replace(/^#{1,6}\s*/, "")
    .replace(/^[\d\uFE0F\u20E3\s.()]+\s*/u, "")
    .trim();
}

function normForDedup(s: string): string {
  return s
    .replace(/[✅📌📋🔹🔸👉🔎\s\uFE0F\u20E3①②③④⑤⑥⑦⑧⑨⑩]+/gu, "")
    .replace(/^[\d.()]+/, "")
    .trim();
}

function parseSilsonSections(answer: string) {
  // Split line-by-line instead of block-by-block to preserve tables
  const lines = cleanSilsonMarkdown(answer)
    .split("\n")
    .map((line) => line.trim());

  const sections: Array<{ title: string; content: string; tone: SilsonCardTone }> = [];
  const seenTitles = new Set<string>();
  let currentTitle = "";
  let currentLines: string[] = [];

  const flushSection = () => {
    const content = currentLines.join("\n").trim();
    if (!content && !currentTitle) return;

    const merged = content || currentTitle;
    const tone: SilsonCardTone =
      /확인할 수 없습니다|찾지 못했습니다|없습니다/.test(merged)
        ? "warning"
        : /정확한 안내를 위해|필요합니다|구체적으로 알려주시면/.test(merged)
          ? "detail"
          : currentTitle
            ? "detail"
            : "answer";

    sections.push({
      title: currentTitle || (sections.length === 0 ? "핵심 답변" : "추가 안내"),
      content: content || merged,
      tone,
    });
  };

  for (const line of lines) {
    if (!line) continue;
    if (line.startsWith("질문:")) continue;
    if (/^참고(?:\s*문서|\s*자료)?\s*:/i.test(line)) continue;

    // Detect section headings
    const isHeading = /^#{1,6}\s+/.test(line);
    const isNumbered = /^\d[\d\uFE0F\u20E3]*[.\s)]+\S/u.test(line);
    const isCircled = /^[①②③④⑤⑥⑦⑧⑨⑩]\s+/.test(line);

    if (isHeading || isNumbered || isCircled) {
      const title = trimSilsonHeading(line);
      const normKey = normForDedup(title);

      // Skip duplicate titles
      if (seenTitles.has(normKey)) continue;
      seenTitles.add(normKey);

      flushSection();
      currentTitle = title;
      currentLines = [];
      continue;
    }

    // Dedup: skip content line if same as current section title
    if (currentTitle && currentLines.length === 0) {
      const normTitle = normForDedup(currentTitle);
      const normLine = normForDedup(line);
      if (normTitle && normLine && (normTitle === normLine || normLine.startsWith(normTitle) || normTitle.startsWith(normLine))) {
        continue;
      }
    }

    currentLines.push(line);
  }
  flushSection();

  return sections;
}

function formatSilsonSourceLabel(data: SilsonSearchResponse) {
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

  if (labels.length > 0) {
    return labels.slice(0, 5);
  }

  return data.sources
    .map((source) => source.replace(/\.md\b/gi, "").trim())
    .filter(Boolean)
    .slice(0, 5);
}

export function buildSilsonCards(query: string, data: SilsonSearchResponse): SilsonCardSpec[] {
  const cards: SilsonCardSpec[] = [];
  const sourceLabels = formatSilsonSourceLabel(data);

  const answerSections = parseSilsonSections(data.answer);
  const filterSummary = [
    `질문: ${query}`,
    data.filters.generation ? `세대: ${data.filters.generation}` : null,
    data.filters.join_ym ? `가입시기: ${data.filters.join_ym}` : null,
  ].filter(Boolean).join("\n");

  const answerContent = answerSections.length === 0
    ? cleanSilsonMarkdown(data.answer) || "검색 결과를 찾지 못했습니다."
    : answerSections
      .map((section) => `${section.title}\n${section.content}`.trim())
      .join("\n\n");

  cards.push({
    title: "실손 검색 결과",
    tone: data.chunks.length > 0 ? "answer" : "warning",
    content: `${filterSummary}\n\n${answerContent}`.trim(),
    sources: sourceLabels,
    followUps: data.follow_ups?.length ? data.follow_ups : undefined,
  });

  return cards;
}
