import { v4 as uuid } from 'uuid';

export interface MemoryRecord {
  id: string;
  text: string;
  metadata: Record<string, unknown>;
  embedding: number[];
}

export interface MemoryHit {
  id: string;
  text: string;
  score: number;
  metadata: Record<string, unknown>;
}

const DIM = 256;
const TOKEN = /[a-z0-9]+/g;

/**
 * Deterministic, dependency-free embedding: hash each token into a fixed-size
 * bag-of-words vector, then L2-normalize. Good enough to demonstrate semantic
 * recall offline. Replace `embed()` with a real embedding model (or point
 * VECTOR_PROVIDER=chroma) for production-quality retrieval.
 */
export function embed(text: string): number[] {
  const vec = new Array(DIM).fill(0);
  const tokens = text.toLowerCase().match(TOKEN) ?? [];
  for (const tok of tokens) {
    let h = 2166136261;
    for (let i = 0; i < tok.length; i++) {
      h ^= tok.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    vec[Math.abs(h) % DIM] += 1;
  }
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
  return vec.map((v) => v / norm);
}

function cosine(a: number[], b: number[]): number {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot; // both vectors are already normalized
}

/**
 * In-process vector store. This is the shared long-term AI memory used for RAG:
 * the Content agent retrieves the most engaging past posts before writing, and
 * the Recommendation agent stores fresh outcomes back into it (self-learning loop).
 */
class VectorMemory {
  private records: MemoryRecord[] = [];

  add(text: string, metadata: Record<string, unknown> = {}): MemoryRecord {
    const record: MemoryRecord = { id: uuid(), text, metadata, embedding: embed(text) };
    this.records.push(record);
    return record;
  }

  search(query: string, k = 5): MemoryHit[] {
    const q = embed(query);
    return this.records
      .map((r) => ({
        id: r.id,
        text: r.text,
        score: Number(cosine(q, r.embedding).toFixed(4)),
        metadata: r.metadata,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, k);
  }

  size(): number {
    return this.records.length;
  }
}

export const memory = new VectorMemory();
