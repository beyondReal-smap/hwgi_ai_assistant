import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, describe, expect, it } from "vitest";
import { searchSemanticDocuments, type EmbeddingProvider } from "@/lib/openai-embedding-index";

const tempDirs: string[] = [];

function makeTempDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "embedding-index-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  while (tempDirs.length > 0) {
    fs.rmSync(tempDirs.pop()!, { recursive: true, force: true });
  }
});

describe("searchSemanticDocuments", () => {
  it("ranks semantic matches and reuses the cached document index", async () => {
    let callCount = 0;
    const provider: EmbeddingProvider = {
      async createEmbeddings(input) {
        callCount += 1;
        return input.map((text) => {
          if (text.includes("사과")) return [1, 0];
          if (text.includes("바나나")) return [0.8, 0.2];
          if (text.includes("트럭")) return [0, 1];
          if (text.includes("과일")) return [1, 0];
          return [0.1, 0.1];
        });
      },
    };

    const cacheRoot = makeTempDir();
    const documents = [
      { id: "apple", text: "과일 분류: 사과", metadata: { kind: "fruit" } },
      { id: "banana", text: "과일 분류: 바나나", metadata: { kind: "fruit" } },
      { id: "truck", text: "차량 분류: 트럭", metadata: { kind: "vehicle" } },
    ];

    const first = await searchSemanticDocuments({
      cacheKey: "test-index",
      cacheRoot,
      documents,
      query: "과일",
      topK: 2,
      provider,
    });

    const second = await searchSemanticDocuments({
      cacheKey: "test-index",
      cacheRoot,
      documents,
      query: "과일",
      topK: 2,
      provider,
    });

    expect(first.map((match) => match.document.id)).toEqual(["apple", "banana"]);
    expect(second.map((match) => match.document.id)).toEqual(["apple", "banana"]);
    expect(callCount).toBe(3);
  });
});
