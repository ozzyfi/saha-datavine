import { Inbox } from "lucide-react";

export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  action,
}: {
  title: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-dashed border-border p-10 text-center">
      <div className="mx-auto h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-3">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="text-sm font-medium text-foreground">{title}</div>
      {description && <p className="text-xs text-muted-foreground mt-1.5 max-w-sm mx-auto">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-lg border border-dashed border-destructive/40 bg-destructive/5 p-6 text-center">
      <p className="text-sm text-destructive">{message ?? "Bir hata oluştu"}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-3 inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-xs hover:bg-muted"
        >
          Tekrar dene
        </button>
      )}
    </div>
  );
}
