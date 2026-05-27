import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

import { computeQualityScore } from "@/lib/quality";
import { logAIQuery } from "@/lib/logAIQuery";

const SOURCE_VALUES = ["whatsapp", "form", "manual"] as const;
const STATUS_VALUES = ["open", "closed", "pending"] as const;

const schema = z.object({
  source: z.enum(SOURCE_VALUES),
  raw_text: z.string().trim().min(1, "Ham metin gerekli").max(5000),
  location: z.string().trim().max(200).optional().or(z.literal("")),
  topic: z.string().trim().max(200).optional().or(z.literal("")),
  asset_code: z.string().trim().max(100).optional().or(z.literal("")),
  action_required: z.string().trim().max(500).optional().or(z.literal("")),
  root_cause: z.string().trim().max(500).optional().or(z.literal("")),
  resolution: z.string().trim().max(500).optional().or(z.literal("")),
  status: z.enum(STATUS_VALUES),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  orgId: string | null;
  onCreated: () => void;
}

export function AddFieldRecordDialog({ open, onOpenChange, orgId, onCreated }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { source: "manual", status: "open", raw_text: "" },
  });

  const source = watch("source");
  const status = watch("status");
  const rootCause = watch("root_cause");

  const onSubmit = async (values: FormValues) => {
    if (!orgId) {
      toast.error("Workspace henüz hazır değil, biraz sonra deneyin.");
      return;
    }
    setSubmitting(true);
    try {
      let assetId: string | null = null;
      if (values.asset_code) {
        const { data: asset } = await supabase
          .from("assets")
          .select("id")
          .eq("org_id", orgId)
          .eq("code", values.asset_code)
          .maybeSingle();
        if (asset?.id) {
          assetId = asset.id;
        } else {
          const { data: created } = await supabase
            .from("assets")
            .insert({ org_id: orgId, code: values.asset_code, name: values.asset_code })
            .select("id")
            .single();
          assetId = created?.id ?? null;
        }
      }

      const payload = {
        org_id: orgId,
        source: values.source,
        raw_text: values.raw_text,
        location: values.location || null,
        topic: values.topic || null,
        asset_id: assetId,
        action_required: values.action_required || null,
        status: values.status,
        closed_at: values.status === "closed" ? new Date().toISOString() : null,
        evidence_urls: [] as string[],
        root_cause: values.root_cause || null,
        resolution: values.resolution || null,
      };
      const quality_score = computeQualityScore(payload);
      const { data: inserted, error } = await supabase
        .from("field_records")
        .insert({ ...payload, quality_score })
        .select("id")
        .single();
      if (error) throw error;
      if (inserted?.id) {
        supabase.functions.invoke("embed-record", { body: { record_id: inserted.id } }).catch(() => {});
      }
      logAIQuery({
        orgId,
        query_text: `Field record submitted (${values.source}, ${values.status})`,
        sources_accessed: ["field_records"],
      });
      toast.success("Kayıt eklendi ✓");
      reset({ source: "manual", status: "open", raw_text: "" });
      onOpenChange(false);
      onCreated();
    } catch (e: any) {
      toast.error(e?.message ?? "Kayıt eklenemedi");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">Yeni Saha Kaydı Ekle</DialogTitle>
          <DialogDescription>
            Manuel saha kaydı oluşturun — AI sorgularına anında dahil olur.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Kaynak</Label>
              <Select value={source} onValueChange={(v) => setValue("source", v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="whatsapp">WhatsApp Mesajı</SelectItem>
                  <SelectItem value="form">Servis Formu</SelectItem>
                  <SelectItem value="manual">Manuel Giriş</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Durum</Label>
              <Select value={status} onValueChange={(v) => setValue("status", v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Açık</SelectItem>
                  <SelectItem value="closed">Kapandı</SelectItem>
                  <SelectItem value="pending">Beklemede</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Ham metin *</Label>
            <Textarea rows={4} placeholder="Ham metin veya mesaj içeriği" {...register("raw_text")} />
            {errors.raw_text && <p className="text-xs text-primary">{errors.raw_text.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Lokasyon</Label>
              <Input placeholder="örn. Oda 304, Hat 2" {...register("location")} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Konu</Label>
              <Input placeholder="örn. Klima arızası" {...register("topic")} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Ekipman kodu</Label>
              <Input placeholder="örn. P-204" {...register("asset_code")} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Aksiyon</Label>
              <Input placeholder="Yapılması gereken" {...register("action_required")} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Kök Neden</Label>
            <Textarea rows={2} maxLength={500} placeholder="Sorunun kök nedeni" {...register("root_cause")} />
            {status === "closed" && !rootCause?.trim() && (
              <p className="text-xs text-muted-foreground">
                Kapatılan kayıtlarda kök neden önerilir
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Çözüm / Kapanış Notu</Label>
            <Textarea rows={2} maxLength={500} placeholder="Yapılan çözüm veya kapanış detayı" {...register("resolution")} />
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
              disabled={submitting}
              className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-60"
            >
              {submitting ? "Ekleniyor…" : "Kaydı Ekle"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
