import {
  getCustomersByWorkplace,
  getCustomersByWorkplaces,
  getGoodsDetailsByCoverageNames,
  getGoodsDetailsByProductNames,
  getUniqueCoverageNames,
  getUniqueProductNames,
  getUniqueWorkplaceNames,
  type CsvCustomer,
  type CsvGoodsDetail,
} from "@/lib/csv-data";
import { fuzzyScore } from "@/lib/csv-utils";
import {
  isOpenAIEmbeddingConfigured,
  searchSemanticDocuments,
  type SemanticDocument,
} from "@/lib/openai-embedding-index";

type SearchMode = "semantic" | "lexical-fallback";

interface SearchResult<T> {
  items: T[];
  matchedTerms: string[];
  mode: SearchMode;
}

interface TermMetadata {
  term: string;
}

interface TermIndexConfig {
  cacheKey: string;
  label: string;
  minScore: number;
}

const DEFAULT_TOPK = 8;
const MAX_MATCHED_TERMS = 5;
const EMBEDDING_DIMENSIONS = (() => {
  const raw = process.env.OPENAI_EMBEDDING_DIMENSIONS?.trim();
  if (!raw) return undefined;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
})();

const WORKPLACE_INDEX: TermIndexConfig = {
  cacheKey: "customer-workplace-v1",
  label: "직장 또는 직업",
  minScore: 0.38,
};

const PRODUCT_INDEX: TermIndexConfig = {
  cacheKey: "customer-product-v1",
  label: "보험 상품명",
  minScore: 0.42,
};

const COVERAGE_INDEX: TermIndexConfig = {
  cacheKey: "customer-coverage-v1",
  label: "보험 담보명",
  minScore: 0.4,
};

function normalizeText(value: string): string {
  return value.replace(/\s+/g, "").toLowerCase();
}

function buildTermDocuments(terms: string[], label: string): SemanticDocument<TermMetadata>[] {
  return terms.map((term) => ({
    id: term,
    text: `${label}: ${term}`,
    metadata: { term },
  }));
}

function getLexicalMatches(keyword: string, terms: string[]): string[] {
  const normalizedKeyword = normalizeText(keyword);
  if (!normalizedKeyword) return [];

  return terms.filter((term) => {
    const normalizedTerm = normalizeText(term);
    return normalizedTerm.includes(normalizedKeyword) || normalizedKeyword.includes(normalizedTerm);
  });
}

function rankMatchedTerms(
  keyword: string,
  lexicalMatches: string[],
  semanticMatches: Array<{ term: string; score: number }>,
  minScore: number,
): string[] {
  const scored = new Map<string, number>();
  const topSemanticScore = semanticMatches[0]?.score ?? 0;

  for (const term of lexicalMatches) {
    scored.set(term, 10 + fuzzyScore(keyword, term));
  }

  for (const match of semanticMatches) {
    const lexical = fuzzyScore(keyword, match.term);
    const isExact = lexicalMatches.includes(match.term);
    const passesThreshold = match.score >= minScore || (match.score >= topSemanticScore - 0.02 && lexical >= 0.2);
    if (!passesThreshold && !isExact) continue;

    const combinedScore = match.score + lexical + (isExact ? 5 : 0);
    const current = scored.get(match.term) ?? Number.NEGATIVE_INFINITY;
    scored.set(match.term, Math.max(current, combinedScore));
  }

  return [...scored.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], "ko"))
    .slice(0, MAX_MATCHED_TERMS)
    .map(([term]) => term);
}

async function resolveMatchedTerms(
  keyword: string,
  terms: string[],
  config: TermIndexConfig,
): Promise<{ matchedTerms: string[]; mode: SearchMode }> {
  const lexicalMatches = getLexicalMatches(keyword, terms);
  if (!isOpenAIEmbeddingConfigured()) {
    return {
      matchedTerms: lexicalMatches.slice(0, MAX_MATCHED_TERMS),
      mode: "lexical-fallback",
    };
  }

  try {
    const semanticMatches = await searchSemanticDocuments({
      cacheKey: config.cacheKey,
      documents: buildTermDocuments(terms, config.label),
      query: `${config.label} 검색: ${keyword}`,
      topK: DEFAULT_TOPK,
      dimensions: EMBEDDING_DIMENSIONS,
    });

    const rankedTerms = rankMatchedTerms(
      keyword,
      lexicalMatches,
      semanticMatches.map((match) => ({
        term: match.document.metadata.term,
        score: match.score,
      })),
      config.minScore,
    );

    return {
      matchedTerms: rankedTerms.length > 0 ? rankedTerms : lexicalMatches.slice(0, MAX_MATCHED_TERMS),
      mode: rankedTerms.length > 0 ? "semantic" : "lexical-fallback",
    };
  } catch {
    return {
      matchedTerms: lexicalMatches.slice(0, MAX_MATCHED_TERMS),
      mode: "lexical-fallback",
    };
  }
}

export async function searchCustomersBySemanticWorkplace(
  keyword: string,
  fpName?: string,
): Promise<SearchResult<CsvCustomer>> {
  const exactCustomers = getCustomersByWorkplace(keyword, fpName);
  const { matchedTerms, mode } = await resolveMatchedTerms(keyword, getUniqueWorkplaceNames(), WORKPLACE_INDEX);

  const customers = matchedTerms.length > 0
    ? getCustomersByWorkplaces(matchedTerms, fpName)
    : exactCustomers;

  return {
    items: customers,
    matchedTerms,
    mode,
  };
}

export async function searchGoodsBySemanticProduct(
  keyword: string,
): Promise<SearchResult<CsvGoodsDetail>> {
  const exactItems = getGoodsDetailsByProductNames(getLexicalMatches(keyword, getUniqueProductNames()));
  const { matchedTerms, mode } = await resolveMatchedTerms(keyword, getUniqueProductNames(), PRODUCT_INDEX);

  return {
    items: matchedTerms.length > 0 ? getGoodsDetailsByProductNames(matchedTerms) : exactItems,
    matchedTerms,
    mode,
  };
}

export async function searchGoodsBySemanticCoverage(
  keyword: string,
): Promise<SearchResult<CsvGoodsDetail>> {
  const exactItems = getGoodsDetailsByCoverageNames(getLexicalMatches(keyword, getUniqueCoverageNames()));
  const { matchedTerms, mode } = await resolveMatchedTerms(keyword, getUniqueCoverageNames(), COVERAGE_INDEX);

  return {
    items: matchedTerms.length > 0 ? getGoodsDetailsByCoverageNames(matchedTerms) : exactItems,
    matchedTerms,
    mode,
  };
}
