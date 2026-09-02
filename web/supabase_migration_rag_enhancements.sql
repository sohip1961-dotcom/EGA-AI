-- Migration: Enhanced Hybrid Search for Curriculum Chunks (RAG v3)
-- Improves full-text search matching using OR-logic tsquery, null-safety, and rank-boosting

CREATE OR REPLACE FUNCTION hybrid_search_curriculum(
  p_curriculum_id UUID,
  p_query_embedding VECTOR(768),
  p_arabic_query TEXT DEFAULT '',
  p_english_query TEXT DEFAULT '',
  p_match_count INT DEFAULT 8,
  p_rrf_k INT DEFAULT 60
)
RETURNS TABLE(
  id UUID,
  content TEXT,
  heading TEXT,
  parent_id UUID,
  position_index INTEGER,
  rrf_score FLOAT
)
LANGUAGE SQL STABLE
AS $$
  WITH
  -- Vector search: cosine similarity on HyDE embedding
  vector_search AS (
    SELECT
      cc.id,
      ROW_NUMBER() OVER (ORDER BY cc.embedding <=> p_query_embedding) AS rank
    FROM public.curriculum_chunks cc
    WHERE
      cc.curriculum_id = p_curriculum_id
      AND cc.chunk_level = 'child'
      AND cc.embedding IS NOT NULL
      AND p_query_embedding IS NOT NULL
    ORDER BY cc.embedding <=> p_query_embedding
    LIMIT 50
  ),
  -- Arabic BM25 search with flexible tsquery
  bm25_arabic AS (
    SELECT
      cc.id,
      ROW_NUMBER() OVER (
        ORDER BY ts_rank_cd(cc.fts_arabic, websearch_to_tsquery('simple', p_arabic_query)) DESC
      ) AS rank
    FROM public.curriculum_chunks cc
    WHERE
      cc.curriculum_id = p_curriculum_id
      AND cc.chunk_level = 'child'
      AND NULLIF(trim(p_arabic_query), '') IS NOT NULL
      AND cc.fts_arabic @@ websearch_to_tsquery('simple', p_arabic_query)
    LIMIT 50
  ),
  -- English BM25 search with flexible tsquery
  bm25_english AS (
    SELECT
      cc.id,
      ROW_NUMBER() OVER (
        ORDER BY ts_rank_cd(cc.fts_english, websearch_to_tsquery('english', p_english_query)) DESC
      ) AS rank
    FROM public.curriculum_chunks cc
    WHERE
      cc.curriculum_id = p_curriculum_id
      AND cc.chunk_level = 'child'
      AND NULLIF(trim(p_english_query), '') IS NOT NULL
      AND cc.fts_english @@ websearch_to_tsquery('english', p_english_query)
    LIMIT 50
  ),
  -- RRF fusion across all three signals
  rrf_scores AS (
    SELECT
      COALESCE(vs.id, ba.id, be.id) AS chunk_id,
      COALESCE(1.0 / (p_rrf_k + vs.rank), 0.0)
        + COALESCE(1.0 / (p_rrf_k + ba.rank), 0.0)
        + COALESCE(1.0 / (p_rrf_k + be.rank), 0.0)
      AS rrf_score
    FROM vector_search vs
    FULL OUTER JOIN bm25_arabic ba ON vs.id = ba.id
    FULL OUTER JOIN bm25_english be ON COALESCE(vs.id, ba.id) = be.id
  )
  SELECT
    cc.id,
    cc.content,
    cc.heading,
    cc.parent_id,
    cc.position_index,
    rs.rrf_score
  FROM rrf_scores rs
  JOIN public.curriculum_chunks cc ON cc.id = rs.chunk_id
  ORDER BY rs.rrf_score DESC
  LIMIT p_match_count;
$$;
