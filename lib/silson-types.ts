export interface SilsonSearchRequest {
  query: string;
  topk?: number;
}

export interface SilsonStructuredAnswer {
  summary: string;
  context_note?: string;
  answer: string;
  coverage_points?: string[];
  cautions?: string[];
  checkpoints?: string[];
  reference_note?: string;
}

export interface SilsonChunk {
  doc_id: string;
  source_kind: string;
  source_label: string;
  generation: string;
  product_alias: string;
  sales_period: string;
  coverage_name: string;
  clause_name: string;
  clause_text_oneline: string;
  source_file: string;
  filename: string;
  score: number;
  document_excerpt: string;
}

export interface SilsonSearchResponse {
  query: string;
  answer: string;
  sources: string[];
  chunks: SilsonChunk[];
  mode: {
    retrieval: string;
    llm_status: string;
  };
  filters: {
    generation: string | null;
    source_kind: string | null;
    join_ym: number | null;
  };
  follow_ups?: string[];
  structured_answer?: SilsonStructuredAnswer | null;
}
