import { useState } from "react";
import { Plus, KeyRound, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/empty-state";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/lib/supabase";
import { useUserOrg } from "@/hooks/useUserOrg";
import { useApiKeys, type ApiKey } from "@/hooks/useApiKeys";
import { CreateApiKeyDialog } from "@/components/CreateApiKeyDialog";
import { Breadcrumb, CodeBlock } from "@/pages/Index";
import { relativeTime } from "@/pages/screens/DataSourcesScreen";

export function APIScreen() {
  const tools = [
    { t: "search_field_memory", d: "Ekipman, iş, denetim ve saha kayıtlarında kaynaklı arama", a: "Read" },
    { t: "get_asset_history", d: "Ekipman geçmişi, tekrar eden arıza ve kapanış kayıtları", a: "Read" },
    { t: "list_missing_evidence", d: "Eksik kanıt, kök neden veya kapanış alanlarını listeler", a: "Read" },
    { t: "create_followup_task", d: "Eksik veri için saha ekibine takip görevi açar", a: "Write" },
  ];
  const { orgId } = useUserOrg();
  const { keys, loading: keysLoading, error: keysError, reload } = useApiKeys(orgId);
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="space-y-10">
      <div>
        <Breadcrumb screen="api" />
        <div className="mt-4 flex items-end justify-between gap-4">
          <div>
            <h1 className="font-serif text-5xl text-foreground">API / MCP</h1>
            <p className="text-sm text-muted-foreground mt-2">
              ToolA Data Layer'ı kurumsal agent'lara ve kendi uygulamalarınıza açın.
            </p>
          </div>
          <button
            onClick={() => setDialogOpen(true)}
            className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> Create key
          </button>
        </div>
      </div>

      <CreateApiKeyDialog open={dialogOpen} onOpenChange={setDialogOpen} orgId={orgId} onCreated={reload} />

      <section className="rounded-lg border border-border bg-card p-6">
        <h3 className="font-serif text-2xl text-foreground">MCP Endpoint</h3>
        <p className="text-sm text-muted-foreground mt-1 mb-4">
          Claude, Cursor, ChatGPT connector veya custom agent'lar için model-bağımsız erişim.
        </p>
        <CodeBlock>https://api.saha.team/mcp</CodeBlock>
      </section>

      {keysError ? (
        <ErrorState message={keysError} onRetry={reload} />
      ) : (
        <ApiKeysTable keys={keys} loading={keysLoading} onChange={reload} onCreate={() => setDialogOpen(true)} />
      )}

      <section className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="font-serif text-2xl text-foreground">Available tools</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wider text-muted-foreground bg-muted/50">
              <th className="text-left font-medium px-6 py-3">Tool</th>
              <th className="text-left font-medium px-6 py-3">Açıklama</th>
              <th className="text-left font-medium px-6 py-3">Yetki</th>
            </tr>
          </thead>
          <tbody>
            {tools.map((r) => (
              <tr key={r.t} className="border-t border-border">
                <td className="px-6 py-4 font-mono text-xs text-foreground">{r.t}</td>
                <td className="px-6 py-4 text-muted-foreground">{r.d}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs ${r.a === "Write" ? "border-primary/30 text-primary bg-primary/5" : "border-border text-muted-foreground"}`}>
                    {r.a}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

export function ApiKeysTable({ keys, loading, onChange, onCreate }: { keys: ApiKey[]; loading: boolean; onChange: () => void; onCreate?: () => void }) {
  const [pendingDelete, setPendingDelete] = useState<ApiKey | null>(null);

  const toggleActive = async (k: ApiKey) => {
    const { error } = await supabase.from("api_keys").update({ is_active: !k.is_active }).eq("id", k.id);
    if (error) toast.error(error.message);
    else {
      toast.success(k.is_active ? "Anahtar pasifleştirildi" : "Anahtar etkinleştirildi");
      onChange();
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const { error } = await supabase.from("api_keys").delete().eq("id", pendingDelete.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Anahtar silindi");
      onChange();
    }
    setPendingDelete(null);
  };

  return (
    <section className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="px-6 py-4 border-b border-border">
        <h3 className="font-serif text-2xl text-foreground">API Anahtarları</h3>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs uppercase tracking-wider text-muted-foreground bg-muted/50">
            <th className="text-left font-medium px-6 py-3">Name</th>
            <th className="text-left font-medium px-6 py-3">Preview</th>
            <th className="text-left font-medium px-6 py-3">Created</th>
            <th className="text-left font-medium px-6 py-3">Last used</th>
            <th className="text-left font-medium px-6 py-3">Active</th>
            <th className="text-right font-medium px-6 py-3"></th>
          </tr>
        </thead>
        <tbody>
          {loading && [0, 1, 2].map((i) => (
            <tr key={i} className="border-t border-border">
              <td colSpan={6} className="px-6 py-4"><Skeleton className="h-5 w-full" /></td>
            </tr>
          ))}
          {!loading && keys.length === 0 && (
            <tr><td colSpan={6} className="p-0">
              <EmptyState
                icon={KeyRound}
                title="Henüz API anahtarı yok"
                description="Kurumsal AI ajanları için ilk API anahtarınızı oluşturun."
                action={onCreate && (
                  <button onClick={onCreate} className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-xs hover:opacity-90">
                    <Plus className="h-3.5 w-3.5" /> Create key
                  </button>
                )}
              />
            </td></tr>
          )}
          {!loading && keys.map((k) => (
            <tr key={k.id} className="border-t border-border">
              <td className="px-6 py-4 text-foreground">{k.name}</td>
              <td className="px-6 py-4 font-mono text-xs text-muted-foreground">{k.key_preview}</td>
              <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">{relativeTime(k.created_at)}</td>
              <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">
                {k.last_used_at ? relativeTime(k.last_used_at) : "—"}
              </td>
              <td className="px-6 py-4">
                <Switch checked={k.is_active} onCheckedChange={() => toggleActive(k)} />
              </td>
              <td className="px-6 py-4 text-right">
                <button
                  onClick={() => setPendingDelete(k)}
                  className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-primary"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <AlertDialog open={!!pendingDelete} onOpenChange={(v) => !v && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Anahtarı sil?</AlertDialogTitle>
            <AlertDialogDescription>
              "{pendingDelete?.name}" anahtarı kalıcı olarak silinecek. Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-primary text-primary-foreground hover:opacity-90">
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
