
-- Prevent role escalation: only admins can update/delete memberships, and admins cannot change their own role
CREATE POLICY "Admins can update memberships" ON public.organization_members
FOR UPDATE TO authenticated
USING (public.is_org_admin(auth.uid(), org_id) AND user_id <> auth.uid())
WITH CHECK (public.is_org_admin(auth.uid(), org_id) AND user_id <> auth.uid());

CREATE POLICY "Admins can delete memberships" ON public.organization_members
FOR DELETE TO authenticated
USING (public.is_org_admin(auth.uid(), org_id) AND user_id <> auth.uid());
