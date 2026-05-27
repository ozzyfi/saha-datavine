CREATE OR REPLACE FUNCTION public.match_field_records(_org_id uuid, _user_id uuid, _embedding extensions.vector, _match_count integer)
 RETURNS TABLE(id uuid, org_id uuid, topic text, raw_text text, location text, status text, root_cause text, resolution text, action_required text, quality_score integer, created_at timestamp with time zone, similarity double precision)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
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
    AND public.is_org_member(_user_id, fr.org_id)
  ORDER BY fr.embedding <=> _embedding
  LIMIT _match_count;
$function$;