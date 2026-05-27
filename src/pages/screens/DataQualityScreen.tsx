import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/empty-state";
import { useUserOrg } from "@/hooks/useUserOrg";
import { useDataQuality } from "@/hooks/useDataQuality";
import { logAIQuery } from "@/lib/logAIQuery";
import { Breadcrumb } from "@/pages/Index";

export function DataQualityScreen() {
  const { orgId } = useUserOrg();
  const { data, loading, error, reload } = useDataQuality(orgId);

  const fmt = (n: number | null | undefined, suffix = "") =>
    loading || data === null ? "…" : n === null || n === undefined ? "—" : `${n}${suffix}`;

  return (
    <div className="space-y-10">
      <div>
        <Breadcrumb screen="data-quality" />
        <div className="mt-4 flex items-end justify-between gap-4">
          <div>
            <h1 className="font-serif text-5xl text-foreground">Data Quality</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Sahadan gelen verinin AI tarafından güvenilir kullanılabilirliğini ölçün.
            </p>
          </div>
          <button
            onClick={() => {
              reload();
              logAIQuery({
                orgId,
                query_text: "Manual data quality audit run",
                sources_accessed: ["field_records"],
              });
              toast.success("Analiz güncellendi");
            }}
            className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm hover:opacity-90"
          >
            Run audit
          </button>
        </div>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <QualityCard value={loading ? <Skeleton className="h-12 w-20" /> : fmt(data?.qualityScore ?? null, "%")} label="Quality Score" text="Genel AI-ready veri kalitesi." />
            <QualityCard value={loading ? <Skeleton className="h-12 w-20" /> : fmt(data?.evidencedClosed ?? 0)} label="Kanıtlı Kapanış" text="Fotoğraf, ses veya ölçümle kapanan işler." />
            <QualityCard value={loading ? <Skeleton className="h-12 w-20" /> : fmt(data?.missingRootCause ?? 0)} label="Eksik Kök Neden" text="Kapanmış ama kök nedeni eksik işler." />
            <QualityCard value={loading ? <Skeleton className="h-12 w-20" /> : fmt(data?.unmatchedEvidence ?? 0)} label="Eşleşmeyen Kanıt" text="İş veya ekipmana bağlanmamış fotoğraf/ses kayıtları." />
          </div>

          <section className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="px-6 py-4 border-b border-border">
              <h3 className="font-serif text-2xl text-foreground">Fix suggestions</h3>
            </div>
            {loading ? (
              <div className="p-6 space-y-3">
                {[0, 1, 2].map((i) => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            ) : (data?.issues.length ?? 0) === 0 ? (
              <EmptyState icon={ShieldCheck} title="Tüm kayıtlar AI-ready" description="İyi iş — düzeltilecek bir kayıt bulunamadı." />
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wider text-muted-foreground bg-muted/50">
                    <th className="text-left font-medium px-6 py-3">Problem</th>
                    <th className="text-left font-medium px-6 py-3">Kayıt</th>
                    <th className="text-left font-medium px-6 py-3">Öneri</th>
                    <th className="text-left font-medium px-6 py-3">Durum</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.issues.map((r) => (
                    <tr key={r.id} className="border-t border-border">
                      <td className="px-6 py-4 text-foreground">{r.problem}</td>
                      <td className="px-6 py-4 font-mono text-xs text-muted-foreground">{r.id.slice(0, 8)}</td>
                      <td className="px-6 py-4 text-muted-foreground">{r.suggestion}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex rounded-full border border-border px-2.5 py-0.5 text-xs">{r.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}
    </div>
  );
}

export function QualityCard({ value, label, text }: { value: React.ReactNode; label: string; text: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="font-serif text-5xl text-foreground">{value}</div>
      <div className="text-sm text-foreground mt-2">{label}</div>
      <p className="text-xs text-muted-foreground mt-1">{text}</p>
    </div>
  );
}
