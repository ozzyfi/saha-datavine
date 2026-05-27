CREATE TABLE public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  key_preview TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX idx_api_keys_org ON public.api_keys(org_id);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view org api keys"
ON public.api_keys FOR SELECT TO authenticated
USING (public.is_org_member(auth.uid(), org_id));

CREATE POLICY "Members can insert org api keys"
ON public.api_keys FOR INSERT TO authenticated
WITH CHECK (public.is_org_member(auth.uid(), org_id));

CREATE POLICY "Members can update org api keys"
ON public.api_keys FOR UPDATE TO authenticated
USING (public.is_org_member(auth.uid(), org_id))
WITH CHECK (public.is_org_member(auth.uid(), org_id));

CREATE POLICY "Members can delete org api keys"
ON public.api_keys FOR DELETE TO authenticated
USING (public.is_org_member(auth.uid(), org_id));