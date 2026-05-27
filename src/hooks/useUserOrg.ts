import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Returns the current user's primary org_id.
 * If the user has no organization yet, auto-provisions a personal workspace.
 */
export function useUserOrg() {
  const { user } = useAuth();
  const [orgId, setOrgId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setOrgId(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: existing } = await supabase
        .from("organization_members")
        .select("org_id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      if (existing?.org_id) {
        if (!cancelled) {
          setOrgId(existing.org_id);
          setLoading(false);
        }
        return;
      }

      const name = (user.email?.split("@")[0] ?? "Workspace") + "'s Workspace";
      const { data: org } = await supabase
        .from("organizations")
        .insert({ name })
        .select("id")
        .single();

      if (org?.id) {
        await supabase
          .from("organization_members")
          .insert({ org_id: org.id, user_id: user.id, role: "owner" });
        if (!cancelled) setOrgId(org.id);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return { orgId, loading };
}
