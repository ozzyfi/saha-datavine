-- Extensions
CREATE EXTENSION IF NOT EXISTS vector;

-- =========================
-- Organizations
-- =========================
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- =========================
-- Organization membership (drives RLS)
-- =========================
CREATE TYPE public.org_role AS ENUM ('owner', 'admin', 'member');

CREATE TABLE public.organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.org_role NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, user_id)
);

CREATE INDEX idx_org_members_user ON public.organization_members(user_id);
CREATE INDEX idx_org_members_org  ON public.organization_members(org_id);

ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- Security definer helper: avoids recursive RLS lookups
CREATE OR REPLACE FUNCTION public.is_org_member(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE user_id = _user_id
      AND org_id  = _org_id
  );
$$;

-- Organizations: members can view their org
CREATE POLICY "Members can view their organizations"
ON public.organizations
FOR SELECT
TO authenticated
USING (public.is_org_member(auth.uid(), id));

-- Organization members: users can view membership rows of orgs they belong to
CREATE POLICY "Users can view memberships of their organizations"
ON public.organization_members
FOR SELECT
TO authenticated
USING (public.is_org_member(auth.uid(), org_id));

-- =========================
-- Assets
-- =========================
CREATE TABLE public.assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  location TEXT,
  type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_assets_org ON public.assets(org_id);

ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view org assets"
ON public.assets FOR SELECT TO authenticated
USING (public.is_org_member(auth.uid(), org_id));

CREATE POLICY "Members can insert org assets"
ON public.assets FOR INSERT TO authenticated
WITH CHECK (public.is_org_member(auth.uid(), org_id));

CREATE POLICY "Members can update org assets"
ON public.assets FOR UPDATE TO authenticated
USING (public.is_org_member(auth.uid(), org_id))
WITH CHECK (public.is_org_member(auth.uid(), org_id));

CREATE POLICY "Members can delete org assets"
ON public.assets FOR DELETE TO authenticated
USING (public.is_org_member(auth.uid(), org_id));

-- =========================
-- Field records (core memory)
-- =========================
CREATE TABLE public.field_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  source TEXT NOT NULL,                 -- 'whatsapp' | 'form' | 'manual'
  raw_text TEXT,
  location TEXT,
  topic TEXT,
  action_required TEXT,
  asset_id UUID REFERENCES public.assets(id) ON DELETE SET NULL,
  evidence_urls TEXT[],
  root_cause TEXT,
  resolution TEXT,
  status TEXT NOT NULL DEFAULT 'open',  -- 'open' | 'closed' | 'pending'
  quality_score INTEGER CHECK (quality_score IS NULL OR (quality_score BETWEEN 0 AND 100)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ
);

CREATE INDEX idx_field_records_org    ON public.field_records(org_id);
CREATE INDEX idx_field_records_asset  ON public.field_records(asset_id);
CREATE INDEX idx_field_records_status ON public.field_records(status);

ALTER TABLE public.field_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view org field records"
ON public.field_records FOR SELECT TO authenticated
USING (public.is_org_member(auth.uid(), org_id));

CREATE POLICY "Members can insert org field records"
ON public.field_records FOR INSERT TO authenticated
WITH CHECK (public.is_org_member(auth.uid(), org_id));

CREATE POLICY "Members can update org field records"
ON public.field_records FOR UPDATE TO authenticated
USING (public.is_org_member(auth.uid(), org_id))
WITH CHECK (public.is_org_member(auth.uid(), org_id));

CREATE POLICY "Members can delete org field records"
ON public.field_records FOR DELETE TO authenticated
USING (public.is_org_member(auth.uid(), org_id));

-- =========================
-- AI query log
-- =========================
CREATE TABLE public.ai_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ai_client TEXT,                       -- 'Claude' | 'ChatGPT' | 'Local LLM'
  query_text TEXT,
  sources_accessed TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_queries_org ON public.ai_queries(org_id);

ALTER TABLE public.ai_queries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view org AI queries"
ON public.ai_queries FOR SELECT TO authenticated
USING (public.is_org_member(auth.uid(), org_id));

CREATE POLICY "Members can insert org AI queries"
ON public.ai_queries FOR INSERT TO authenticated
WITH CHECK (public.is_org_member(auth.uid(), org_id));

CREATE POLICY "Members can delete org AI queries"
ON public.ai_queries FOR DELETE TO authenticated
USING (public.is_org_member(auth.uid(), org_id));