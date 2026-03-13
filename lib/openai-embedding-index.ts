import fs from "fs";
import path from "path";
import { createHash } from "crypto";
import OpenAI from "openai";

const DEFAULT_EMBEDDING_MODEL = process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small";
const DEFAULT_BATCH_SIZE = Math.max(
  1,
  Math.min(Number.parseInt(process.env.OPENAI_EMBEDDING_BATCH_SIZE ?? "64", 10) || 64, 256),
);
const DEFAULT_CACHE_ROOT = path.join(process.cwd(), "artifacts", "openai-embeddings");
const INDEX_VERSION = 1;

export interface SemanticDocument<TMetadata> {
  id: string;
  text: string;
  metadata: TMetadata;
}

interface CachedDocument<TMetadata> extends SemanticDocument<TMetadata> {}

interface IndexMeta<TMetadata> {
  version: number;
  model: string;
  dimensions: number | null;
  dataHash: string;
  createdAt: string;
  documents: CachedDocument<TMetadata>[];
}

interface LoadedSemanticIndex<TMetadata> {
  key: string;
  model: string;
  dimensions: number;
  documents: CachedDocument<TMetadata>[];
  vectors: Float32Array;
}

export interface SemanticMatch<TMetadata> {
  rank: number;
  score: number;
  document: CachedDocument<TMetadata>;
}

export interface EmbeddingProvider {
  createEmbeddings(input: string[], options: { model: string; dimensions?: number }): Promise<number[][]>;
}

export interface SemanticSearchOptions<TMetadata> {
  cacheKey: string;
  documents: SemanticDocument<TMetadata>[];
  query: string;
  topK?: number;
  model?: string;
  dimensions?: number;
  batchSize?: number;
  cacheRoot?: string;
  provider?: EmbeddingProvider;
}

const indexPromises = new Map<string, Promise<LoadedSemanticIndex<unknown>>>();

function getDefaultProvider(): EmbeddingProvider {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const client = new OpenAI({ apiKey });
  return {
    async createEmbeddings(input, options) {
      const response = await client.embeddings.create({
        model: options.model,
        input,
        ...(options.dimensions ? { dimensions: options.dimensions } : {}),
      });

      return [...response.data]
        .sort((a, b) => a.index - b.index)
        .map((item) => item.embedding);
    },
  };
}

export function isOpenAIEmbeddingConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export function normalizeEmbedding(values: number[]): Float32Array {
  const vector = Float32Array.from(values);
  let sumSquares = 0;
  for (const value of vector) {
    sumSquares += value * value;
  }

  const norm = Math.sqrt(sumSquares);
  if (!Number.isFinite(norm) || norm === 0) {
    return vector;
  }

  for (let i = 0; i < vector.length; i += 1) {
    vector[i] /= norm;
  }
  return vector;
}

function buildDataHash<TMetadata>(
  cacheKey: string,
  documents: SemanticDocument<TMetadata>[],
  model: string,
  dimensions?: number,
): string {
  const hash = createHash("sha256");
  hash.update(cacheKey);
  hash.update(model);
  hash.update(String(dimensions ?? ""));
  for (const document of documents) {
    hash.update(document.id);
    hash.update("\u0000");
    hash.update(document.text);
    hash.update("\u0000");
    hash.update(JSON.stringify(document.metadata));
    hash.update("\u0001");
  }
  return hash.digest("hex");
}

function getIndexPaths(cacheRoot: string, cacheKey: string) {
  const safeKey = cacheKey.replace(/[^a-zA-Z0-9._-]+/g, "_");
  return {
    baseDir: cacheRoot,
    metaPath: path.join(cacheRoot, `${safeKey}.meta.json`),
    vectorPath: path.join(cacheRoot, `${safeKey}.vectors.bin`),
  };
}

function readCachedIndex<TMetadata>(
  cacheKey: string,
  cacheRoot: string,
  dataHash: string,
): LoadedSemanticIndex<TMetadata> | null {
  const paths = getIndexPaths(cacheRoot, cacheKey);
  if (!fs.existsSync(paths.metaPath) || !fs.existsSync(paths.vectorPath)) {
    return null;
  }

  const meta = JSON.parse(fs.readFileSync(paths.metaPath, "utf-8")) as IndexMeta<TMetadata>;
  if (
    meta.version !== INDEX_VERSION
    || meta.dataHash !== dataHash
    || meta.documents.length === 0
  ) {
    return null;
  }

  const buffer = fs.readFileSync(paths.vectorPath);
  const raw = new Float32Array(
    buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
  );
  const dimensions = meta.dimensions ?? Math.floor(raw.length / meta.documents.length);
  if (dimensions <= 0 || raw.length !== meta.documents.length * dimensions) {
    return null;
  }

  return {
    key: cacheKey,
    model: meta.model,
    dimensions,
    documents: meta.documents,
    vectors: raw,
  };
}

function writeCachedIndex<TMetadata>(
  cacheKey: string,
  cacheRoot: string,
  meta: IndexMeta<TMetadata>,
  vectors: Float32Array,
) {
  const paths = getIndexPaths(cacheRoot, cacheKey);
  fs.mkdirSync(paths.baseDir, { recursive: true });

  const metaTmp = `${paths.metaPath}.tmp`;
  const vectorTmp = `${paths.vectorPath}.tmp`;

  fs.writeFileSync(metaTmp, JSON.stringify(meta, null, 2), "utf-8");
  fs.writeFileSync(vectorTmp, Buffer.from(vectors.buffer, vectors.byteOffset, vectors.byteLength));

  fs.renameSync(metaTmp, paths.metaPath);
  fs.renameSync(vectorTmp, paths.vectorPath);
}

async function buildIndex<TMetadata>(
  cacheKey: string,
  cacheRoot: string,
  documents: SemanticDocument<TMetadata>[],
  model: string,
  dimensions: number | undefined,
  batchSize: number,
  provider: EmbeddingProvider,
): Promise<LoadedSemanticIndex<TMetadata>> {
  const normalizedDocuments = documents.map((document) => ({
    ...document,
    text: document.text.trim(),
  })).filter((document) => document.text.length > 0);

  if (normalizedDocuments.length === 0) {
    return {
      key: cacheKey,
      model,
      dimensions: 0,
      documents: [],
      vectors: new Float32Array(),
    };
  }

  const vectorChunks: Float32Array[] = [];
  for (let i = 0; i < normalizedDocuments.length; i += batchSize) {
    const batch = normalizedDocuments.slice(i, i + batchSize);
    const embeddings = await provider.createEmbeddings(
      batch.map((document) => document.text),
      { model, dimensions },
    );
    for (const embedding of embeddings) {
      vectorChunks.push(normalizeEmbedding(embedding));
    }
  }

  const dimension = vectorChunks[0]?.length ?? 0;
  const vectors = new Float32Array(vectorChunks.length * dimension);
  vectorChunks.forEach((chunk, index) => {
    vectors.set(chunk, index * dimension);
  });

  const dataHash = buildDataHash(cacheKey, normalizedDocuments, model, dimensions);
  writeCachedIndex(
    cacheKey,
    cacheRoot,
    {
      version: INDEX_VERSION,
      model,
      dimensions: dimension || dimensions || null,
      dataHash,
      createdAt: new Date().toISOString(),
      documents: normalizedDocuments,
    },
    vectors,
  );

  return {
    key: cacheKey,
    model,
    dimensions: dimension,
    documents: normalizedDocuments,
    vectors,
  };
}

async function ensureIndex<TMetadata>(
  cacheKey: string,
  cacheRoot: string,
  documents: SemanticDocument<TMetadata>[],
  model: string,
  dimensions: number | undefined,
  batchSize: number,
  provider: EmbeddingProvider,
): Promise<LoadedSemanticIndex<TMetadata>> {
  const normalizedDocuments = documents.map((document) => ({
    ...document,
    text: document.text.trim(),
  })).filter((document) => document.text.length > 0);

  const dataHash = buildDataHash(cacheKey, normalizedDocuments, model, dimensions);
  const memoKey = `${cacheKey}:${dataHash}`;
  const cachedPromise = indexPromises.get(memoKey);
  if (cachedPromise) {
    return cachedPromise as Promise<LoadedSemanticIndex<TMetadata>>;
  }

  const loadPromise = (async () => {
    const cached = readCachedIndex<TMetadata>(cacheKey, cacheRoot, dataHash);
    if (cached) {
      return cached;
    }
    return buildIndex(cacheKey, cacheRoot, normalizedDocuments, model, dimensions, batchSize, provider);
  })();

  indexPromises.set(memoKey, loadPromise as Promise<LoadedSemanticIndex<unknown>>);
  return loadPromise;
}

function dotProduct(vectors: Float32Array, dimension: number, queryVector: Float32Array, index: number): number {
  const offset = index * dimension;
  let score = 0;
  for (let i = 0; i < dimension; i += 1) {
    score += vectors[offset + i] * queryVector[i];
  }
  return score;
}

export async function searchSemanticDocuments<TMetadata>({
  cacheKey,
  documents,
  query,
  topK = 5,
  model = DEFAULT_EMBEDDING_MODEL,
  dimensions,
  batchSize = DEFAULT_BATCH_SIZE,
  cacheRoot = DEFAULT_CACHE_ROOT,
  provider,
}: SemanticSearchOptions<TMetadata>): Promise<SemanticMatch<TMetadata>[]> {
  if (!query.trim() || documents.length === 0) {
    return [];
  }

  const embeddingProvider = provider ?? getDefaultProvider();
  const index = await ensureIndex(
    cacheKey,
    cacheRoot,
    documents,
    model,
    dimensions,
    batchSize,
    embeddingProvider,
  );

  if (index.documents.length === 0 || index.dimensions === 0) {
    return [];
  }

  const [rawQueryEmbedding] = await embeddingProvider.createEmbeddings(
    [query.trim()],
    { model, dimensions: index.dimensions || dimensions },
  );
  const queryVector = normalizeEmbedding(rawQueryEmbedding);

  const ranked = index.documents.map((document, indexPosition) => ({
    document,
    score: dotProduct(index.vectors, index.dimensions, queryVector, indexPosition),
  }));

  ranked.sort((left, right) => right.score - left.score);
  return ranked.slice(0, Math.max(1, topK)).map((item, indexPosition) => ({
    rank: indexPosition + 1,
    score: item.score,
    document: item.document,
  }));
}
