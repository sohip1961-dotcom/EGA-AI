/**
 * Hybrid Tri-Fusion Retrieval Engine (Vector Search + Okapi BM25 + GraphRAG)
 * Implements Weighted Reciprocal Rank Fusion (W-RRF), Parent Chunk Expansion,
 * and Knowledge Subgraph Context Injection for the Egyptian Curriculum AI Tutor.
 */

import { CurriculumChunk, db } from './db';
import { BM25Index, BM25SearchResult } from './bm25';
import { KnowledgeGraphEngine, KnowledgeSubgraph } from './graph_rag';

export interface HybridRetrievalOptions {
  topK?: number;
  rrfK?: number;
  weightVector?: number;
  weightBM25?: number;
  weightGraph?: number;
}

export interface HybridRetrievalResult {
  parentChunks: CurriculumChunk[];
  childChunks: CurriculumChunk[];
  subgraph: KnowledgeSubgraph;
  formattedContext: string;
  metrics: {
    vectorCandidateCount: number;
    bm25CandidateCount: number;
    graphEntityCount: number;
    fusedCandidateCount: number;
  };
}

/**
 * Weighted Reciprocal Rank Fusion (W-RRF) across Vector, BM25, and Graph signals.
 */
export function fuseRRF(
  vectorResults: CurriculumChunk[],
  bm25Results: BM25SearchResult[],
  graphChunkIds: string[],
  allCandidateChunksMap: Map<string, CurriculumChunk>,
  options: HybridRetrievalOptions = {}
): { chunk: CurriculumChunk; score: number }[] {
  const k = options.rrfK ?? 60;
  const wVec = options.weightVector ?? 1.0;
  const wBM25 = options.weightBM25 ?? 1.0;
  const wGraph = options.weightGraph ?? 0.85;

  const scoreMap = new Map<string, { chunk: CurriculumChunk; score: number }>();

  // 1. Vector Search ranks
  vectorResults.forEach((chunk, index) => {
    const rank = index + 1;
    const addedScore = wVec * (1.0 / (k + rank));
    scoreMap.set(chunk.id, { chunk, score: addedScore });
    allCandidateChunksMap.set(chunk.id, chunk);
  });

  // 2. BM25 Search ranks
  bm25Results.forEach((res) => {
    const rank = res.rank;
    const addedScore = wBM25 * (1.0 / (k + rank));
    const existing = scoreMap.get(res.doc.id);
    if (existing) {
      existing.score += addedScore;
    } else {
      const chunk = allCandidateChunksMap.get(res.doc.id) || (res.doc as unknown as CurriculumChunk);
      scoreMap.set(res.doc.id, { chunk, score: addedScore });
    }
  });

  // 3. GraphRAG Traversal chunk ranks
  graphChunkIds.forEach((chunkId, index) => {
    const rank = index + 1;
    const addedScore = wGraph * (1.0 / (k + rank));
    const existing = scoreMap.get(chunkId);
    if (existing) {
      existing.score += addedScore;
    } else {
      const chunk = allCandidateChunksMap.get(chunkId);
      if (chunk) {
        scoreMap.set(chunkId, { chunk, score: addedScore });
      }
    }
  });

  const sorted = Array.from(scoreMap.values()).sort((a, b) => b.score - a.score);
  return sorted;
}

/**
 * Executes the complete Hybrid Tri-Fusion Retrieval Pipeline:
 * Vector Search + Okapi BM25 + GraphRAG Traversal + Parent Breadcrumb Expansion.
 */
export async function runHybridTriFusionRetrieval(
  gradeLevel: string,
  subjectName: string,
  query: string,
  queryEmbedding: number[],
  keywords: string[],
  options: HybridRetrievalOptions = {}
): Promise<HybridRetrievalResult> {
  const cleanGrade = gradeLevel.trim();
  const cleanSubject = subjectName.trim();
  const topK = options.topK ?? 8;

  // 1. Retrieve all curriculum chunks & graph data for this curriculum
  const [curriculumRecord, allCurriculumChunks, graphData] = await Promise.all([
    db.getCurriculumRecord(cleanGrade, cleanSubject).catch(err => {
      console.warn('getCurriculumRecord notice:', err);
      return null;
    }),
    db.getAllChunksForCurriculum(cleanGrade, cleanSubject).catch(err => {
      console.warn('getAllChunksForCurriculum notice:', err);
      return [] as CurriculumChunk[];
    }),
    db.getCurriculumGraph(cleanGrade, cleanSubject).catch(err => {
      console.warn('getCurriculumGraph notice:', err);
      return { entities: [], relations: [] };
    })
  ]);

  const candidateChunksMap = new Map<string, CurriculumChunk>();
  allCurriculumChunks.forEach(c => candidateChunksMap.set(c.id, c));

  // 2. Parallel Channel Execution: Vector + BM25 + GraphRAG
  const vectorPromise = (async () => {
    if (!queryEmbedding || queryEmbedding.length === 0) return [];
    try {
      return await db.vectorSearchCurriculum(cleanGrade, cleanSubject, queryEmbedding);
    } catch (err) {
      console.warn('Vector search notice (falling back):', err);
      return [];
    }
  })();

  const bm25Promise = (async () => {
    try {
      if (allCurriculumChunks.length === 0) return [];
      const childChunks = allCurriculumChunks.filter(c => c.chunk_level === 'child');
      const docsToIndex = (childChunks.length > 0 ? childChunks : allCurriculumChunks).map(c => ({
        id: c.id,
        heading: c.heading,
        content: c.content,
        parent_id: c.parent_id,
        position_index: c.position_index
      }));

      const bm25Index = new BM25Index(docsToIndex);
      return bm25Index.search(query, 30);
    } catch (err) {
      console.warn('BM25 search notice (falling back):', err);
      return [];
    }
  })();

  const graphPromise = (async () => {
    try {
      if (!graphData || graphData.entities.length === 0) {
        return {
          entities: [],
          relations: [],
          connectedChunkIds: [],
          relevanceScore: 0,
          synthesizedContext: ''
        } as KnowledgeSubgraph;
      }

      const engine = new KnowledgeGraphEngine(graphData.entities, graphData.relations);
      return engine.retrieveKnowledgeGraph(query, keywords);
    } catch (err) {
      console.warn('Graph traversal notice (falling back):', err);
      return {
        entities: [],
        relations: [],
        connectedChunkIds: [],
        relevanceScore: 0,
        synthesizedContext: ''
      } as KnowledgeSubgraph;
    }
  })();

  const [vectorCandidates, bm25Candidates, subgraph] = await Promise.all([
    vectorPromise,
    bm25Promise,
    graphPromise
  ]);

  // 3. Weighted Reciprocal Rank Fusion
  const fusedScores = fuseRRF(
    vectorCandidates,
    bm25Candidates,
    subgraph.connectedChunkIds,
    candidateChunksMap,
    options
  );

  const topChildChunks = fusedScores.slice(0, topK).map(s => s.chunk);

  // 4. Parent Expansion with Hierarchical Breadcrumbs
  const parentIds = [...new Set(
    topChildChunks
      .map(c => c.parent_id)
      .filter((id): id is string => !!id)
  )];

  let parentChunks: CurriculumChunk[] = [];
  if (parentIds.length > 0) {
    parentChunks = await db.getParentChunks(parentIds).catch(err => {
      console.warn('getParentChunks notice:', err);
      return [] as CurriculumChunk[];
    });
  }

  // Fallback if no parents or child chunks are already parent sections
  if (parentChunks.length === 0) {
    parentChunks = topChildChunks;
  }

  // 5. Build Formatted Context Block
  let contextParts: string[] = [];

  // A. Syllabus Outline if present
  if (curriculumRecord?.units && Array.isArray(curriculumRecord.units) && curriculumRecord.units.length > 0) {
    const unitMap = curriculumRecord.units.map((u: any, uIdx: number) => {
      const lessons = Array.isArray(u.lessons) ? u.lessons : [];
      const lessonTitles = lessons.map((l: any, lIdx: number) => `      - ${l.title || `الدرس ${lIdx + 1}`}`).join('\n');
      return `  * ${u.title || `الوحدة ${uIdx + 1}`}:\n${lessonTitles}`;
    }).join('\n');
    contextParts.push(`خريطة وحدات ودروس المنهج الدراسي:\n${unitMap}`);
  }

  // B. Knowledge Graph Subgraph Block
  if (subgraph.synthesizedContext) {
    contextParts.push(subgraph.synthesizedContext);
  }

  // C. Textbook Parent Sections
  if (parentChunks.length > 0) {
    const textbookText = parentChunks.map((parent, index) => {
      return `--- القسم ${index + 1}: [${parent.heading}] ---\n` +
             `محتوى الدرس المقرر:\n${parent.content}\n` +
             `-----------------------------------------`;
    }).join('\n\n');
    contextParts.push(textbookText);
  }

  const formattedContext = contextParts.join('\n\n');

  return {
    parentChunks,
    childChunks: topChildChunks,
    subgraph,
    formattedContext,
    metrics: {
      vectorCandidateCount: vectorCandidates.length,
      bm25CandidateCount: bm25Candidates.length,
      graphEntityCount: subgraph.entities.length,
      fusedCandidateCount: fusedScores.length
    }
  };
}
