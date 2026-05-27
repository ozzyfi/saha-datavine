import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";


export type Period = "7d" | "14d" | "30d" | "90d";

export interface DashboardStats {
  totalRecords: number;
  avgQuality: number | null;
  evidencedClosed: number;
  queriesInPeriod: number;
  series: { date: string; records: number; queries: number }[];
}

const periodDays: Record<Period, number> = { "7d": 7, "14d": 14, "30d": 30, "90d": 90 };

function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function useDashboardStats(period: Period, orgId: string | null = null) {
  const [data, setData] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const reload = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    if (!orgId) {
      setData(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    const days = periodDays[period];
    const since = new Date();
    since.setUTCHours(0, 0, 0, 0);
    since.setUTCDate(since.getUTCDate() - (days - 1));
    const sinceIso = since.toISOString();

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [totalRes, qualityRes, evidencedRes, queriesCountRes, recordsSeriesRes, queriesSeriesRes] =
          await Promise.all([
            supabase.from("field_records").select("id", { count: "exact", head: true }).eq("org_id", orgId).gte("created_at", sinceIso),
            supabase.from("field_records").select("quality_score").eq("org_id", orgId).gte("created_at", sinceIso).not("quality_score", "is", null),
            supabase
              .from("field_records")
              .select("id", { count: "exact", head: true })
              .eq("org_id", orgId)
              .eq("status", "closed")
              .gte("created_at", sinceIso)
              .not("evidence_urls", "is", null)
              .not("evidence_urls", "eq", "{}"),
            supabase
              .from("ai_queries")
              .select("id", { count: "exact", head: true })
              .eq("org_id", orgId)
              .gte("created_at", sinceIso),
            supabase.from("field_records").select("created_at").eq("org_id", orgId).gte("created_at", sinceIso),
            supabase.from("ai_queries").select("created_at").eq("org_id", orgId).gte("created_at", sinceIso),
          ]);

        const errs = [totalRes, qualityRes, evidencedRes, queriesCountRes, recordsSeriesRes, queriesSeriesRes]
          .map((r) => r.error)
          .filter(Boolean);
        if (errs.length) throw errs[0];

        const qualityRows = (qualityRes.data ?? []) as { quality_score: number | null }[];
        const validScores = qualityRows.map((r) => r.quality_score).filter((v): v is number => typeof v === "number");
        const avgQuality = validScores.length
          ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length)
          : null;

        const buckets: Record<string, { records: number; queries: number }> = {};
        for (let i = 0; i < days; i++) {
          const d = new Date(since);
          d.setUTCDate(since.getUTCDate() + i);
          buckets[dayKey(d)] = { records: 0, queries: 0 };
        }
        for (const row of (recordsSeriesRes.data ?? []) as { created_at: string }[]) {
          const k = row.created_at.slice(0, 10);
          if (buckets[k]) buckets[k].records += 1;
        }
        for (const row of (queriesSeriesRes.data ?? []) as { created_at: string }[]) {
          const k = row.created_at.slice(0, 10);
          if (buckets[k]) buckets[k].queries += 1;
        }
        const series = Object.entries(buckets).map(([date, v]) => ({ date, ...v }));

        if (!cancelled) {
          setData({
            totalRecords: totalRes.count ?? 0,
            avgQuality,
            evidencedClosed: evidencedRes.count ?? 0,
            queriesInPeriod: queriesCountRes.count ?? 0,
            series,
          });
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [period, orgId, refreshKey]);

  return { data, loading, error, reload };
}
