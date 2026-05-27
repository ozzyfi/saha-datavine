import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export const RECORD_QUOTA = 5000;

export function useOrgRecordCount(orgId: string | null, refreshKey = 0) {
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) {
      setCount(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { count: c } = await supabase
        .from("field_records")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId);
      if (!cancelled) {
        setCount(c ?? 0);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orgId, refreshKey]);

  return { count, loading };
}
