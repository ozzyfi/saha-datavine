
-- Helper: is the user an admin of the org?
CREATE OR REPLACE FUNCTION public.is_org_admin(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = _user_id AND org_id = _org_id AND role = 'admin'
  );
$$;

-- Replace the overly permissive INSERT policy
DROP POLICY IF EXISTS "Members can join their organization" ON public.organization_members;

CREATE POLICY "Admins add members or creator bootstraps org"
ON public.organization_members
FOR INSERT
TO authenticated
WITH CHECK (
  -- Bootstrap: first member of a new org must be themselves as admin
  (
    user_id = auth.uid()
    AND role = 'admin'
    AND NOT EXISTS (
      SELECT 1 FROM public.organization_members m WHERE m.org_id = organization_members.org_id
    )
  )
  OR
  -- Otherwise, only existing admins can add members
  public.is_org_admin(auth.uid(), org_id)
);
