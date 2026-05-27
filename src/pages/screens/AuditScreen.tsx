import { useState } from "react";
import { FileSearch } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/empty-state";
import { useUserOrg } from "@/hooks/useUserOrg";
import { useAuditLog } from "@/hooks/useAuditLog";
import { Breadcrumb } from "@/pages/Index";
import { relativeTime } from "@/pages/screens/DataSourcesScreen";

export function AuditScreen() {
  const { orgId } = useUserOrg();
  const { entries, loading, error, reload } = useAuditLog(orgId);
  const [search, setSearch] = useState("");
  const [client, setClient] = useState("Tümü");

  const filtered = entries.filter((e) => {
    if (client !== "Tümü" && (e.ai_client ?? "") !== client) return false;
    if (search && !(e.query_text ?? "").toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-10">
      <div>
        <Breadcrumb screen="audit" />
        <h1 className="font-serif text-5xl text-foreground mt-4">Audit</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Hangi AI client, hangi saha verisine, hangi kaynak üzerinden erişti?
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Sorgu içinde ara…"
          className="flex-1 h-10 px-3 rounded-md border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <select
          value={client}
          onChange={(e) => setClient(e.target.value)}
          className="h-10 px-3 rounded-md border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          {["Tümü", "Platform", "Claude", "ChatGPT", "Copilot", "Local LLM"].map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (
      <section className="rounded-lg border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-8 w-full" />)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={FileSearch}
            title={entries.length === 0 ? "Henüz AI sorgusu yapılmadı" : "Filtreyle eşleşen sorgu yok"}
            description={entries.length === 0 ? "AI sorguları yapıldıkça burada görünür." : "Farklı bir client veya arama deneyin."}
          />
        ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wider text-muted-foreground bg-muted/50">
              <th className="text-left font-medium px-6 py-3">Zaman</th>
              <th className="text-left font-medium px-6 py-3">Client</th>
              <th className="text-left font-medium px-6 py-3">Sorgu</th>
              <th className="text-left font-medium px-6 py-3">Kaynaklar</th>
              <th className="text-left font-medium px-6 py-3">Kullanıcı</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">{relativeTime(r.created_at)}</td>
                <td className="px-6 py-4 text-foreground">{r.ai_client ?? "—"}</td>
                <td className="px-6 py-4 text-foreground">{r.query_text ?? "—"}</td>
                <td className="px-6 py-4 text-muted-foreground">{(r.sources_accessed ?? []).join(", ") || "—"}</td>
                <td className="px-6 py-4 text-xs text-muted-foreground">{r.user_email ? (r.user_email.length > 24 ? r.user_email.slice(0, 24) + "…" : r.user_email) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        )}
      </section>
      )}
    </div>
  );
}
