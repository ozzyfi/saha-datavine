import { useState } from "react";
import { Plus, X, Lock, Mail, Inbox, Database } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/empty-state";
import { useUserOrg } from "@/hooks/useUserOrg";
import { useRecentFieldRecords, type FieldRecord } from "@/hooks/useRecentFieldRecords";
import { AddFieldRecordDialog } from "@/components/AddFieldRecordDialog";
import { FieldRecordDetailSheet } from "@/components/FieldRecordDetailSheet";
import {
  Breadcrumb,
  StatusBadge,
  isOnboardingDismissed,
  dismissOnboarding,
  ONBOARDING_DATASOURCES_KEY,
} from "@/pages/Index";
import { AIClientPanel, WorkflowPanel } from "@/pages/screens/AIClientsScreen";

export function DataSourcesScreen() {
  const [showOnboarding, setShowOnboarding] = useState(() => !isOnboardingDismissed(ONBOARDING_DATASOURCES_KEY));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const { orgId } = useUserOrg();
  const { records, loading: recordsLoading, error: recordsError, reload: reloadRecords } = useRecentFieldRecords(orgId, refreshKey);
  const [selected, setSelected] = useState<FieldRecord | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  return (
    <div className="space-y-12">
      {showOnboarding && (
        <section className="rounded-lg border border-border bg-card p-8 relative">
          <button onClick={() => { dismissOnboarding(ONBOARDING_DATASOURCES_KEY); setShowOnboarding(false); }} className="absolute top-5 right-5 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
          <h2 className="font-serif text-3xl text-foreground">Welcome to ToolA</h2>
          <p className="text-sm text-muted-foreground mt-1">0 / 5 free queries used · No credit card required</p>

          <div className="mt-8">
            <div className="flex items-start gap-4">
              <span className="shrink-0 inline-flex h-6 w-6 items-center justify-center rounded bg-muted text-xs border border-border">1</span>
              <div className="flex-1 min-w-0">
                <div className="text-foreground font-medium">Connect an AI client</div>
                <p className="text-sm text-muted-foreground mt-1 mb-5">
                  Connect your AI assistant to access your organization's field data through ToolA.
                </p>
                <AIClientPanel />
              </div>
            </div>
          </div>

          <div className="mt-10 flex items-start gap-4">
            <span className="shrink-0 inline-flex h-6 w-6 items-center justify-center rounded bg-muted text-xs border border-border">2</span>
            <div className="flex-1 min-w-0">
              <div className="text-foreground font-medium">Choose a workflow</div>
              <WorkflowPanel />
            </div>
          </div>
        </section>
      )}

      <div>
        <Breadcrumb screen="data-sources" />
        <div className="mt-4 flex items-end justify-between gap-4">
          <div>
            <h1 className="font-serif text-5xl text-foreground">Data Sources</h1>
            <p className="text-sm text-muted-foreground mt-2">Saha verisi ve operasyon kaynaklarınızı bağlayın.</p>
          </div>
          <button
            onClick={() => setDialogOpen(true)}
            className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm hover:opacity-90 transition-opacity"
          >
            <Plus className="h-4 w-4" /> Add source
          </button>
        </div>
      </div>

      <AddFieldRecordDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        orgId={orgId}
        onCreated={() => setRefreshKey((k) => k + 1)}
      />

      <section>
        <h3 className="text-sm font-medium text-foreground mb-4">Field Operations</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SourceCard title="WhatsApp İş Mesajları" text="Bakım şefi, operatör ve saha ekiplerinden gelen görev mesajları." status="Setup" />
          <SourceCard title="Mobil Kanıt Akışı" text="Fotoğraf, ses, video, ölçüm, QR ve kapanış notları." status="Setup" />
        </div>
      </section>

      <section>
        <h3 className="text-sm font-medium text-foreground mb-4">Business Systems</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SourceCard title="Servis Formları & Excel" text="Eski servis formları, kontrol listeleri ve kapanış kayıtları." status="Setup" />
          <SourceCard title="ERP / CMMS Export" text="SAP, Maximo, Logo, Excel veya özel bakım sistemi exportları." status="Setup" />
          <SourceCard title="Teknik Dokümanlar" text="OEM kılavuzları, HSE prosedürleri, bakım talimatları ve PDF arşivi." status="Setup" />
          <SourceCard title="Ekipman Listesi" text="Ekipman kodları, lokasyonlar, parçalar ve varlık hiyerarşisi." status="Setup" />
        </div>
      </section>

      <section>
        <h3 className="text-sm font-medium text-foreground mb-4">Son Saha Kayıtları</h3>
        {recordsError ? (
          <ErrorState message={recordsError} onRetry={reloadRecords} />
        ) : (
          <RecentRecordsList
            records={records}
            loading={recordsLoading}
            onAdd={() => setDialogOpen(true)}
            onSelect={(r) => { setSelected(r); setDetailOpen(true); }}
          />
        )}
        <FieldRecordDetailSheet
          record={selected}
          open={detailOpen}
          onOpenChange={setDetailOpen}
          onUpdated={() => { setRefreshKey((k) => k + 1); reloadRecords(); }}
        />
      </section>

      <section className="relative">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 blur-sm select-none pointer-events-none">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-lg border border-border bg-card p-5 h-32">
              <div className="h-3 w-24 bg-muted rounded mb-3" />
              <div className="h-2 w-full bg-muted rounded mb-2" />
              <div className="h-2 w-3/4 bg-muted rounded" />
            </div>
          ))}
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center max-w-md bg-card/80 backdrop-blur p-6 rounded-lg">
            <Lock className="h-5 w-5 text-muted-foreground mx-auto mb-3" />
            <h4 className="font-serif text-2xl text-foreground">Contact us for more access</h4>
            <p className="text-sm text-muted-foreground mt-2 mb-4">
              HSE, kalite denetim, lojistik, inşaat ve saha satış veri kaynakları için enterprise erişim açılabilir.
            </p>
            <button className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm hover:opacity-90">
              <Mail className="h-4 w-4" /> Contact us
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

export function RecentRecordsList({ records, loading, onAdd, onSelect }: { records: FieldRecord[]; loading: boolean; onAdd?: () => void; onSelect?: (r: FieldRecord) => void }) {
  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-card divide-y divide-border">
        {[0, 1, 2].map((i) => (
          <div key={i} className="px-5 py-4 flex items-center gap-4">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-3 w-24 ml-auto" />
          </div>
        ))}
      </div>
    );
  }
  if (records.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        title="Henüz saha kaydı yok"
        description='"Add source" ile ilk saha kaydınızı ekleyin — anında AI sorgularına dahil olur.'
        action={onAdd && (
          <button onClick={onAdd} className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-xs hover:opacity-90">
            <Plus className="h-3.5 w-3.5" /> Add source
          </button>
        )}
      />
    );
  }
  const statusLabel: Record<string, string> = { open: "Açık", closed: "Kapandı", pending: "Beklemede" };
  const statusClass: Record<string, string> = {
    open: "bg-amber-100 text-amber-800",
    closed: "bg-emerald-100 text-emerald-800",
    pending: "bg-muted text-muted-foreground",
  };
  return (
    <div className="rounded-lg border border-border bg-card divide-y divide-border">
      {records.map((r) => (
        <button
          key={r.id}
          type="button"
          onClick={() => onSelect?.(r)}
          className="w-full text-left px-5 py-4 flex items-center gap-4 text-sm hover:bg-muted/50 transition-colors"
        >
          <span className="font-mono text-[11px] text-muted-foreground w-16 shrink-0">{r.id.slice(0, 8)}</span>
          <div className="min-w-0 flex-1">
            <div className="text-foreground truncate">{r.topic || "—"}</div>
            <div className="text-xs text-muted-foreground truncate">{r.location || "Lokasyon belirtilmedi"}</div>
          </div>
          <span className={`text-[11px] px-2 py-0.5 rounded ${statusClass[r.status] ?? statusClass.pending}`}>
            {statusLabel[r.status] ?? r.status}
          </span>
          <span className="text-xs text-muted-foreground w-24 text-right shrink-0">{relativeTime(r.created_at)}</span>
        </button>
      ))}
    </div>
  );
}

export function relativeTime(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "şimdi";
  if (diff < 3600) return `${Math.floor(diff / 60)} dakika önce`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} saat önce`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} gün önce`;
  return new Date(iso).toLocaleDateString();
}

export function SourceCard({ title, text, status }: { title: string; text: string; status: "Connected" | "Syncing" | "Setup" }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5 flex items-start justify-between gap-4 hover:border-foreground/20 transition-colors">
      <div className="flex items-start gap-4 min-w-0">
        <div className="h-9 w-9 rounded-md bg-muted border border-border flex items-center justify-center shrink-0">
          <Database className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <div className="font-serif text-lg text-foreground">{title}</div>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{text}</p>
        </div>
      </div>
      <StatusBadge status={status} />
    </div>
  );
}
