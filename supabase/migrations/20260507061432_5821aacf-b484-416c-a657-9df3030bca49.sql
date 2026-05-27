-- Move vector extension to a dedicated schema
CREATE SCHEMA IF NOT EXISTS extensions;
ALTER EXTENSION vector SET SCHEMA extensions;

-- Restrict execution of the security-definer helper
REVOKE EXECUTE ON FUNCTION public.is_org_member(UUID, UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_org_member(UUID, UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_org_member(UUID, UUID) FROM authenticated;