export interface JobcodeSearchRequest {
  query: string;
  use_hybrid?: boolean;
  use_cross_encoder?: boolean;
  use_llm?: boolean;
  show_highlight?: boolean;
  score_threshold?: number;
  alpha_bm25?: number;
  topk_bm25?: number;
  topk_embed?: number;
  topk_result?: number;
}

export interface JobcodeRecommendation {
  rank: number;
  job_code: string;
  job_name: string;
  risk_grade: string;
  final_score: number;
  reason: string;
  evidence: string[];
  cited_phrases: string[];
  hits: string[];
  highlighted_description: string;
  raw_description: string;
}

export interface JobcodeSearchResponse {
  recs: JobcodeRecommendation[];
  mode: {
    retrieval: string;
    rerank: string;
    embed_status: string;
    ce_status: string;
    llm_status: string;
  };
  score_threshold: number;
  filtered_out_count: number;
  prefilter_count: number;
}
