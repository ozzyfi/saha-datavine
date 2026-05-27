CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

ALTER TABLE public.field_records
  ADD COLUMN IF NOT EXISTS embedding extensions.vector(1536);

CREATE INDEX IF NOT EXISTS idx_field_records_embedding
  ON public.field_records
  USING hnsw (embedding extensions.vector_cosine_ops);

CREATE OR REPLACE FUNCTION public.match_field_records(
  _org_id uuid,
  _embedding extensions.vector,
  _match_count int
)
RETURNS TABLE (
  id uuid,
  org_id uuid,
  topic text,
  raw_text text,
  location text,
  status text,
  root_cause text,
  resolution text,
  action_required text,
  quality_score int,
  created_at timestamptz,
  similarity float
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT
    fr.id,
    fr.org_id,
    fr.topic,
    fr.raw_text,
    fr.location,
    fr.status,
    fr.root_cause,
    fr.resolution,
    fr.action_required,
    fr.quality_score,
    fr.created_at,
    1 - (fr.embedding <=> _embedding) AS similarity
  FROM public.field_records fr
  WHERE fr.org_id = _org_id
    AND fr.embedding IS NOT NULL
    AND public.is_org_member(auth.uid(), fr.org_id)
  ORDER BY fr.embedding <=> _embedding
  LIMIT _match_count;
$$;