import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { logAIQuery } from "@/lib/logAIQuery";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  orgId: string | null;
  onCreated: () => void;
}

export function CreateApiKeyDialog({ open, onOpenChange, orgId, onCreated }: Props) {
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [revealed, setRevealed] = useState<string | null>(null);

  const reset = () => {
    setName("");
    setRevealed(null);
    setSubmitting(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId) {
      toast.error("Workspace henüz hazır değil");
      return;
    }
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-api-key", {
        body: { name: name.trim(), org_id: orgId },
      });
      if (error) throw error;
      if (!data?.key) throw new Error(data?.error ?? "Anahtar oluşturulamadı");
      logAIQuery({
        orgId,
        query_text: `API key created: ${name.trim()}`,
        sources_accessed: ["api_keys"],
      });
      setRevealed(data.key);
      onCreated();
    } catch (err: any) {
      toast.error(err?.message ?? "Anahtar oluşturulamadı");
    } finally {
      setSubmitting(false);
    }
  };

  const copy = async () => {
    if (!revealed) return;
    await navigator.clipboard.writeText(revealed);
    toast.success("Anahtar kopyalandı");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">
            {revealed ? "API Anahtarı Hazır" : "Yeni API Anahtarı"}
          </DialogTitle>
          <DialogDescription>
            {revealed
              ? "Bu anahtarı şimdi kopyalayın — bir daha gösterilmeyecek."
              : "AI client veya custom agent için bir anahtar oluşturun."}
          </DialogDescription>
        </DialogHeader>

        {!revealed ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Anahtar adı</Label>
              <Input
                autoFocus
                placeholder="örn. Claude Desktop"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
              />
            </div>
            <DialogFooter>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="px-4 py-2 text-sm rounded-md border border-border hover:bg-muted"
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={submitting || !name.trim()}
                className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-60"
              >
                {submitting ? "Oluşturuluyor…" : "Oluştur"}
              </button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="rounded-md border border-border bg-muted/30 p-3 flex items-center gap-2">
              <code className="flex-1 font-mono text-xs break-all">{revealed}</code>
              <button
                onClick={copy}
                className="p-2 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
                title="Copy"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-primary">
              ⚠ Bu anahtar yalnızca bir kez gösterilir. Güvenli bir yere kaydedin.
            </p>
            <DialogFooter>
              <button
                onClick={() => onOpenChange(false)}
                className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:opacity-90"
              >
                Kapat
              </button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
