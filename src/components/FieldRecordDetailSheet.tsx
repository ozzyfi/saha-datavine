import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Trash2, Pencil, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { computeQualityScore } from "@/lib/quality";
import type { FieldRecord } from "@/hooks/useRecentFieldRecords";

const STATUS_VALUES = ["open", "closed", "pending"] as const;
const SOURCE_VALUES = ["whatsapp", "form", "manual"] as const;

const schema = z.object({
  source: z.enum(SOURCE_VALUES),
  status: z.enum(STATUS_VALUES),
  raw_text: z.string().trim().min(1, "Ham metin gerekli").max(5000),
  location: z.string().trim().max(200).optional().or(z.literal("")),
  topic: z.string().trim().max(200).optional().or(z.literal("")),
  action_required: z.string().trim().max(500).optional().or(z.literal("")),
  root_cause: z.string().trim().max(500).optional().or(z.literal("")),
  resolution: z.string().trim().max(500).optional().or(z.literal("")),
});

type FormValues = z.infer<typeof schema>;

const STATUS_LABEL: Record<string, string> = { open: "Açık", closed: "Kapandı", pending: "Beklemede" };

interface Props {
  record: FieldRecord | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onUpdated: () => void;
}

export function FieldRecordDetailSheet({ record, open, onOpenChange, onUpdated }: Props) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [full, setFull] = useState<FieldRecord | null>(record);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      source: "manual",
      status: "open",
      raw_text: "",
      location: "",
      topic: "",
      action_required: "",
      root_cause: "",
      resolution: "",
    },
  });

  // Reset state when record changes / sheet opens
  useEffect(() => {
    setFull(record);
    setEditing(false);
    if (record) {
      reset({
        source: (SOURCE_VALUES as readonly string[]).includes(record.source) ? (record.source as any) : "manual",
        status: (STATUS_VALUES as readonly string[]).includes(record.status) ? (record.status as any) : "open",
        raw_text: record.raw_text ?? "",
        location: record.location ?? "",
        topic: record.topic ?? "",
        action_required: record.action_required ?? "",
        root_cause: record.root_cause ?? "",
        resolution: record.resolution ?? "",
      });
    }
  }, [record, reset]);

  // Fetch full record when sheet opens
  useEffect(() => {
    let cancelled = false;
    if (open && record?.id) {
      supabase
        .from("field_records")
        .select("*")
        .eq("id", record.id)
        .maybeSingle()
        .then(({ data }) => {
          if (cancelled || !data) return;
          setFull(data as FieldRecord);
          reset({
            source: (SOURCE_VALUES as readonly string[]).includes((data as any).source) ? (data as any).source : "manual",
            status: (STATUS_VALUES as readonly string[]).includes((data as any).status) ? (data as any).status : "open",
            raw_text: (data as any).raw_text ?? "",
            location: (data as any).location ?? "",
            topic: (data as any).topic ?? "",
            action_required: (data as any).action_required ?? "",
            root_cause: (data as any).root_cause ?? "",
            resolution: (data as any).resolution ?? "",
          });
        });
    }
    return () => {
      cancelled = true;
    };
  }, [open, record?.id, reset]);

  const status = watch("status");
  const source = watch("source");

  if (!record) return null;

  const r = full ?? record;

  const onSave = async (values: FormValues) => {
    if (!record) return;
    setSaving(true);
    try {
      const payload = {
        source: values.source,
        status: values.status,
        raw_text: values.raw_text,
        location: values.location || null,
        topic: values.topic || null,
        action_required: values.action_required || null,
        root_cause: values.root_cause || null,
        resolution: values.resolution || null,
        closed_at:
          values.status === "closed"
            ? r.closed_at ?? new Date().toISOString()
            : null,
      };
      const quality_score = computeQualityScore({
        ...payload,
        asset_id: r.asset_id ?? null,
        evidence_urls: r.evidence_urls ?? [],
      });
      const { error } = await supabase
        .from("field_records")
        .update({ ...payload, quality_score })
        .eq("id", record.id);
      if (error) throw error;
      supabase.functions.invoke("embed-record", { body: { record_id: record.id } }).catch(() => {})
      toast.success("Kayıt güncellendi ✓");
      onUpdated();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Güncellenemedi");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!record) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from("field_records").delete().eq("id", record.id);
      if (error) throw error;
      toast.success("Kayıt silindi");
      setConfirmDelete(false);
      onUpdated();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Silinemedi");
    } finally {
      setDeleting(false);
    }
  };

  const fmtDate = (iso?: string | null) => (iso ? new Date(iso).toLocaleString() : "—");

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="font-serif text-2xl">Saha Kaydı</SheetTitle>
            <SheetDescription className="font-mono text-[11px] truncate">{r.id}</SheetDescription>
          </SheetHeader>

          <div className="mt-4 flex items-center gap-2">
            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted"
              >
                <Pencil className="h-3.5 w-3.5" /> Düzenle
              </button>
            ) : (
              <button
                onClick={() => setEditing(false)}
                className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted"
              >
                <X className="h-3.5 w-3.5" /> Vazgeç
              </button>
            )}
            <button
              onClick={() => setConfirmDelete(true)}
              className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-destructive/40 text-destructive px-3 py-1.5 text-xs hover:bg-destructive/10"
            >
              <Trash2 className="h-3.5 w-3.5" /> Sil
            </button>
          </div>

          <form onSubmit={handleSubmit(onSave)} className="mt-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Kaynak">
                {editing ? (
                  <Select value={source} onValueChange={(v) => setValue("source", v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="form">Servis Formu</SelectItem>
                      <SelectItem value="manual">Manuel</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <ReadValue value={r.source} />
                )}
              </Field>
              <Field label="Durum">
                <Select
                  value={status}
                  onValueChange={(v) => setValue("status", v as any)}
                  disabled={!editing}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Açık</SelectItem>
                    <SelectItem value="closed">Kapandı</SelectItem>
                    <SelectItem value="pending">Beklemede</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <Field label="Konu">
              {editing ? <Input {...register("topic")} /> : <ReadValue value={r.topic} />}
            </Field>

            <Field label="Lokasyon">
              {editing ? <Input {...register("location")} /> : <ReadValue value={r.location} />}
            </Field>

            <Field label="Ekipman ID">
              <ReadValue value={r.asset_id} mono />
            </Field>

            <Field label="Ham metin">
              {editing ? (
                <>
                  <Textarea rows={4} {...register("raw_text")} />
                  {errors.raw_text && <p className="text-xs text-primary mt-1">{errors.raw_text.message}</p>}
                </>
              ) : (
                <ReadValue value={r.raw_text} multiline />
              )}
            </Field>

            <Field label="Kök Neden">
              {editing ? (
                <Textarea rows={2} maxLength={500} {...register("root_cause")} />
              ) : (
                <ReadValue value={r.root_cause} multiline />
              )}
            </Field>

            <Field label="Çözüm / Kapanış Notu">
              {editing ? (
                <Textarea rows={2} maxLength={500} {...register("resolution")} />
              ) : (
                <ReadValue value={r.resolution} multiline />
              )}
            </Field>

            <Field label="Aksiyon">
              {editing ? <Input {...register("action_required")} /> : <ReadValue value={r.action_required} />}
            </Field>

            <Field label="Kanıtlar">
              {r.evidence_urls && r.evidence_urls.length > 0 ? (
                <ul className="space-y-1">
                  {r.evidence_urls.map((u, i) => (
                    <li key={i} className="text-xs">
                      <a href={u} target="_blank" rel="noreferrer" className="text-primary hover:underline break-all">
                        {u}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <ReadValue value={null} />
              )}
            </Field>

            <div className="grid grid-cols-3 gap-3">
              <Field label="Kalite">
                <span className="inline-flex items-center rounded bg-muted px-2 py-0.5 text-xs">
                  {r.quality_score ?? "—"}
                </span>
              </Field>
              <Field label="Oluşturulma">
                <span className="text-xs text-muted-foreground">{fmtDate(r.created_at)}</span>
              </Field>
              <Field label="Kapanış">
                <span className="text-xs text-muted-foreground">{fmtDate(r.closed_at)}</span>
              </Field>
            </div>

            {editing && (
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="px-4 py-2 text-sm rounded-md border border-border hover:bg-muted"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-60"
                >
                  {saving ? "Kaydediliyor…" : "Kaydet"}
                </button>
              </div>
            )}
          </form>
        </SheetContent>
      </Sheet>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kaydı sil?</AlertDialogTitle>
            <AlertDialogDescription>
              Bu kayıt kalıcı olarak silinecek ve geri alınamayacak.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete} disabled={deleting}>
              {deleting ? "Siliniyor…" : "Sil"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function ReadValue({ value, multiline, mono }: { value?: string | null; multiline?: boolean; mono?: boolean }) {
  if (!value) return <span className="text-sm text-muted-foreground">—</span>;
  return (
    <div
      className={`text-sm text-foreground ${mono ? "font-mono text-xs break-all" : ""} ${
        multiline ? "whitespace-pre-wrap" : ""
      }`}
    >
      {value}
    </div>
  );
}
