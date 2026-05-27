import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export interface AuditEntry {
  id: string;
  created_at: string;
  ai_client: string | null;
  query_text: string | null;
  sources_accessed: string[] | null;
  user_id: string | null;
  user_email?: string | null;
}

export function useAuditLog(orgId: string | null) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!orgId) {
      setEntries([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("ai_queries")
      .select("id, created_at, ai_client, query_text, sources_accessed, user_id")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    const rows = (data as AuditEntry[]) ?? [];
    const userIds = Array.from(new Set(rows.map((r) => r.user_id).filter(Boolean) as string[]));
    let emailMap: Record<string, string> = {};
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email")
        .in("id", userIds);
      emailMap = Object.fromEntries((profiles ?? []).map((p: any) => [p.id, p.email]));
    }
    setEntries(rows.map((r) => ({ ...r, user_email: r.user_id ? emailMap[r.user_id] ?? null : null })));
    setLoading(false);
  }, [orgId]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { entries, loading, error, reload };
}
