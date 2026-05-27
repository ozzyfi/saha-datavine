import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export interface ApiKey {
  id: string;
  name: string;
  key_preview: string;
  created_at: string;
  last_used_at: string | null;
  is_active: boolean;
}

export function useApiKeys(orgId: string | null) {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!orgId) {
      setKeys([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("api_keys")
      .select("id, name, key_preview, created_at, last_used_at, is_active")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    setKeys((data as ApiKey[]) ?? []);
    setLoading(false);
  }, [orgId]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { keys, loading, error, reload };
}

