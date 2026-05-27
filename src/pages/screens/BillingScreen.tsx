import { Breadcrumb } from "@/pages/Index";

export function BillingScreen() {
  return (
    <div className="space-y-8">
      <div>
        <Breadcrumb screen="billing" />
        <h1 className="font-serif text-5xl text-foreground mt-4">Billing</h1>
        <p className="text-sm text-muted-foreground mt-2">Kredi, kullanım ve fatura yönetimi.</p>
      </div>
      <section className="rounded-lg border border-border bg-card p-8">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Bakiye</div>
        <div className="font-serif text-5xl mt-2">$0.00</div>
        <button className="mt-5 inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm hover:opacity-90">
          Kredi ekle
        </button>
      </section>
    </div>
  );
}
