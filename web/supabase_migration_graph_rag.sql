-- Migration: GraphRAG Knowledge Graph & Hybrid Retrieval (RAG v4)
-- Adds curriculum_entities and curriculum_relations tables with indexing and cascade deletions

CREATE TABLE IF NOT EXISTS public.curriculum_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  curriculum_id UUID NOT NULL REFERENCES public.curriculums(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'concept',
  description TEXT NOT NULL DEFAULT '',
  aliases JSONB NOT NULL DEFAULT '[]'::jsonb,
  chunk_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  importance_score NUMERIC NOT NULL DEFAULT 0.5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_curriculum_entities_curriculum_id ON public.curriculum_entities(curriculum_id);
CREATE INDEX IF NOT EXISTS idx_curriculum_entities_norm_name ON public.curriculum_entities(curriculum_id, normalized_name);
CREATE INDEX IF NOT EXISTS idx_curriculum_entities_category ON public.curriculum_entities(category);

CREATE TABLE IF NOT EXISTS public.curriculum_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  curriculum_id UUID NOT NULL REFERENCES public.curriculums(id) ON DELETE CASCADE,
  source_entity_id UUID NOT NULL REFERENCES public.curriculum_entities(id) ON DELETE CASCADE,
  target_entity_id UUID NOT NULL REFERENCES public.curriculum_entities(id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL DEFAULT 'part_of',
  description TEXT NOT NULL DEFAULT '',
  weight NUMERIC NOT NULL DEFAULT 0.7,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_curriculum_relations_curriculum_id ON public.curriculum_relations(curriculum_id);
CREATE INDEX IF NOT EXISTS idx_curriculum_relations_source ON public.curriculum_relations(source_entity_id);
CREATE INDEX IF NOT EXISTS idx_curriculum_relations_target ON public.curriculum_relations(target_entity_id);
CREATE INDEX IF NOT EXISTS idx_curriculum_relations_type ON public.curriculum_relations(relation_type);

-- RAG v4 Enhanced Hybrid Search with GraphRAG entity and chunk boost
CREATE OR REPLACE FUNCTION hybrid_search_curriculum_v4(
  p_curriculum_id UUID,
  p_query_embedding VECTOR(768),
  p_arabic_query TEXT DEFAULT '',
  p_english_query TEXT DEFAULT '',
  p_graph_chunk_ids UUID[] DEFAULT ARRAY[]::UUID[],
  p_match_count INT DEFAULT 8,
  p_rrf_k INT DEFAULT 60,
  p_w_vector FLOAT DEFAULT 1.0,
  p_w_bm25 FLOAT DEFAULT 1.0,
  p_w_graph FLOAT DEFAULT 0.85
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
  graph_chunks AS (
    SELECT
      cc.id,
      ROW_NUMBER() OVER () AS rank
    FROM public.curriculum_chunks cc
    WHERE
      cc.curriculum_id = p_curriculum_id
      AND cc.id = ANY(p_graph_chunk_ids)
    LIMIT 30
  ),
  fused AS (
    SELECT
      COALESCE(vs.id, ba.id, gc.id) AS chunk_id,
      COALESCE(p_w_vector / (p_rrf_k + vs.rank), 0.0)
        + COALESCE(p_w_bm25 / (p_rrf_k + ba.rank), 0.0)
        + COALESCE(p_w_graph / (p_rrf_k + gc.rank), 0.0)
      AS rrf_score
    FROM vector_search vs
    FULL OUTER JOIN bm25_arabic ba ON vs.id = ba.id
    FULL OUTER JOIN graph_chunks gc ON COALESCE(vs.id, ba.id) = gc.id
  )
  SELECT
    cc.id,
    cc.content,
    cc.heading,
    cc.parent_id,
    cc.position_index,
    f.rrf_score
  FROM fused f
  JOIN public.curriculum_chunks cc ON cc.id = f.chunk_id
  ORDER BY f.rrf_score DESC
  LIMIT p_match_count;
$$;
