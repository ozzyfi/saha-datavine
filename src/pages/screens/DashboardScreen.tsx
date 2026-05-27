import { useState } from "react";
import { X, Sparkles, Database, Code2, ShieldCheck } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/empty-state";
import { workspaceName } from "@/lib/workspaceName";
import { useAuth } from "@/contexts/AuthContext";
import { useUserOrg } from "@/hooks/useUserOrg";
import { useDashboardStats, type Period } from "@/hooks/useDashboardStats";
import { Breadcrumb } from "@/pages/Index";
import { Step } from "@/pages/screens/AIClientsScreen";

export function DashboardScreen({ showOnboarding, onClose }: { showOnboarding: boolean; onClose: () => void }) {
  const [period, setPeriod] = useState<Period>("30d");
  const { orgId } = useUserOrg();
  const { user } = useAuth();
  const { data: stats, loading, error, reload } = useDashboardStats(period, orgId);

  const fmt = (n: number) => n.toLocaleString();

  return (
    <div className="space-y-12">
      {showOnboarding && (
        <section className="rounded-lg border border-border bg-card p-8 relative">
          <button onClick={onClose} className="absolute top-5 right-5 text-muted-foreground hover:text-foreground" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
          <h2 className="font-serif text-3xl text-foreground">Welcome to saha.team</h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
            Şirketinizin saha verisini AI-ready hale getirin. Verinizi ChatGPT, Claude, Copilot veya kendi modelinizle güvenli şekilde sorgulayın.
          </p>
          <ol className="mt-6 space-y-3 max-w-2xl">
            <Step n={1}>Saha veri kaynaklarını bağla</Step>
            <Step n={2}>Veriyi ekipman, iş, kanıt ve kapanış kayıtlarına dönüştür</Step>
            <Step n={3}>İstediğin AI client ile güvenli sorgula</Step>
          </ol>
        </section>
      )}

      <div>
        <Breadcrumb screen="dashboard" />
        <div className="mt-4 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="font-serif text-5xl text-foreground">{workspaceName(user?.email)}</h1>
            <p className="text-sm text-muted-foreground mt-2">AI-ready saha verisi, veri kalitesi ve kullanım performansı.</p>
          </div>
          <div className="inline-flex border border-border rounded-md overflow-hidden text-sm bg-card">
            {(["7d", "14d", "30d", "90d"] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 transition-colors ${period === p ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (
      <section className="rounded-lg border border-border bg-card p-8">
        <div className="text-xs font-medium tracking-widest text-muted-foreground uppercase">Operasyon Performansı ({period})</div>
        <div className="mt-5 grid grid-cols-2 lg:grid-cols-4 gap-8">
          <Metric
            value={loading || !stats ? <Skeleton className="h-9 w-20" /> : fmt(stats.totalRecords)}
            label="AI-ready kayıt"
          />
          <Metric
            value={
              loading || !stats ? <Skeleton className="h-9 w-20" /> : stats.avgQuality === null ? "—" : `${stats.avgQuality}%`
            }
            label="Data quality score"
          />
          <Metric
            value={loading || !stats ? <Skeleton className="h-9 w-20" /> : fmt(stats.evidencedClosed)}
            label="Kanıtlı kapanış"
          />
          <Metric
            value={loading || !stats ? <Skeleton className="h-9 w-20" /> : fmt(stats.queriesInPeriod)}
            label="Sorgu bu dönem"
          />
        </div>

        <div className="mt-8">
          <div className="flex items-center gap-5 text-xs text-muted-foreground mb-3">
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary" /> Kayıt</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-600" /> Sorgu</span>
          </div>
          <DashboardChart loading={loading} series={stats?.series ?? []} totalRecords={stats?.totalRecords ?? 0} />
        </div>
      </section>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SmallCard icon={Sparkles} title="AI Clients" text="Claude, ChatGPT, Copilot veya local LLM bağlantısı kurun." />
        <SmallCard icon={Database} title="Data Sources" text="WhatsApp, servis formu, doküman, fotoğraf ve ERP verilerini bağlayın." />
        <SmallCard icon={Code2} title="API Keys" text="Kurumsal AI ajanları için güvenli API ve MCP erişimi oluşturun." />
        <SmallCard icon={ShieldCheck} title="Quality Score" text="Eksik kök neden, kanıtsız kapanış ve eşleşmeyen kayıtları görün." />
      </div>
    </div>
  );
}

export function Metric({ value, label }: { value: React.ReactNode; label: string }) {
  return (
    <div>
      <div className="font-serif text-4xl text-foreground">{value}</div>
      <div className="text-xs text-muted-foreground mt-1.5">{label}</div>
    </div>
  );
}

export function SmallCard({ icon: Icon, title, text }: { icon: React.ComponentType<{ className?: string }>; title: string; text: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5 hover:border-foreground/20 transition-colors">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <div className="font-serif text-xl text-foreground mt-3">{title}</div>
      <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{text}</p>
    </div>
  );
}

export function DashboardChart({
  loading,
  series,
  totalRecords,
}: {
  loading: boolean;
  series: { date: string; records: number; queries: number }[];
  totalRecords: number;
}) {
  if (loading) {
    return <Skeleton className="h-56 w-full" />;
  }
  if (totalRecords === 0) {
    return (
      <div className="h-56 w-full rounded-md border border-dashed border-border flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Henüz kayıt yok — ilk saha verisini ekleyin</p>
      </div>
    );
  }
  const data = series.map((p) => ({
    ...p,
    label: new Date(p.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
  }));
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
          <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="2 4" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip
            contentStyle={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 6,
              fontSize: 12,
            }}
          />
          <Line type="monotone" dataKey="records" stroke="hsl(var(--primary))" strokeWidth={1.5} dot={false} name="Kayıt" />
          <Line type="monotone" dataKey="queries" stroke="rgb(5, 150, 105)" strokeWidth={1.5} dot={false} name="Sorgu" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
