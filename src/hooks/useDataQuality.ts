import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";


export interface QualityIssueRow {
  id: string;
  problem: string;
  suggestion: string;
  status: string;
}

export interface DataQualityStats {
  qualityScore: number | null;
  evidencedClosed: number;
  missingRootCause: number;
  unmatchedEvidence: number;
  issues: QualityIssueRow[];
}

export function useDataQuality(orgId: string | null) {
  const [data, setData] = useState<DataQualityStats | null>(null);
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
    (async () => {
      setLoading(true);
      setError(null);
      const { data: rows, error: qErr } = await supabase
        .from("field_records")
        .select("id, status, root_cause, resolution, asset_id, evidence_urls, quality_score, topic")
        .eq("org_id", orgId);

      if (qErr) {
        if (!cancelled) {
          setError(qErr.message);
          setLoading(false);
        }
        return;
      }

      const records = rows ?? [];
      const scores = records
        .map((r: any) => r.quality_score)
        .filter((v: any): v is number => typeof v === "number");
      const qualityScore = scores.length
        ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length)
        : null;

      const evidencedClosed = records.filter(
        (r: any) => r.status === "closed" && Array.isArray(r.evidence_urls) && r.evidence_urls.length > 0,
      ).length;
      const missingRootCause = records.filter(
        (r: any) => r.status === "closed" && !r.root_cause,
      ).length;
      const unmatchedEvidence = records.filter(
        (r: any) => Array.isArray(r.evidence_urls) && r.evidence_urls.length > 0 && !r.asset_id,
      ).length;

      const issues: QualityIssueRow[] = records
        .filter((r: any) => {
          const noEvidence = !Array.isArray(r.evidence_urls) || r.evidence_urls.length === 0;
          const unmatched =
            !r.asset_id && Array.isArray(r.evidence_urls) && r.evidence_urls.length > 0;
          const missingResolution = r.status === "closed" && !r.resolution;
          return !r.root_cause || unmatched || missingResolution || noEvidence;
        })
        .slice(0, 50)
        .map((r: any) => {
          const problems: string[] = [];
          const suggestions: string[] = [];
          if (!r.root_cause) {
            problems.push("Kök neden eksik");
            suggestions.push(
              r.status === "closed" ? "Teknisyenden kapanış detayı iste" : "Saha ekibinden eksik bilgiyi talep et",
            );
          }
          if (r.status === "closed" && !r.resolution) {
            problems.push("Çözüm notu eksik");
            suggestions.push("Kapanış detayı ekle");
          }
          if (!Array.isArray(r.evidence_urls) || r.evidence_urls.length === 0) {
            problems.push("Kanıt yok");
            suggestions.push("Fotoğraf veya ölçüm ekle");
          }
          if (!r.asset_id && Array.isArray(r.evidence_urls) && r.evidence_urls.length > 0) {
            problems.push("Eşleşmeyen kanıt");
            suggestions.push("Kanıtı ilgili ekipmana bağla");
          }
          const status =
            r.status === "closed" ? "Bekliyor" : r.status === "pending" ? "Kontrol" : "Önerildi";
          return {
            id: r.id,
            problem: problems.join(" · "),
            suggestion: suggestions[0] ?? "Saha ekibinden eksik bilgiyi talep et",
            status,
          };
        });

      if (!cancelled) {
        setData({ qualityScore, evidencedClosed, missingRootCause, unmatchedEvidence, issues });
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orgId, refreshKey]);

  return { data, loading, error, reload };
}
