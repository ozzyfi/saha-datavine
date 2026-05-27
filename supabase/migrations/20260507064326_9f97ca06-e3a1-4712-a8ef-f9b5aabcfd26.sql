CREATE POLICY "Anyone can create an organization"
ON public.organizations
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Members can join their organization"
ON public.organization_members
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

GRANT EXECUTE ON FUNCTION public.is_org_member(uuid, uuid) TO authenticated;