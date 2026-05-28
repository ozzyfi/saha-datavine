import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Database,
  Sparkles,
  ShieldCheck,
  Code2,
  ScrollText,
  CreditCard,
  Copy,
  ChevronDown,
  LogOut,
  Menu,
} from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { workspaceName, workspaceInitial } from "@/lib/workspaceName";
import { useOrgRecordCount, RECORD_QUOTA } from "@/hooks/useOrgRecordCount";
import { useAuth } from "@/contexts/AuthContext";
import { useUserOrg } from "@/hooks/useUserOrg";
import { Logo } from "@/components/Logo";
import sahaMark from "@/assets/saha-mark.png";
import { DashboardScreen } from "@/pages/screens/DashboardScreen";
import { DataSourcesScreen } from "@/pages/screens/DataSourcesScreen";
import { AIClientsScreen } from "@/pages/screens/AIClientsScreen";
import { DataQualityScreen } from "@/pages/screens/DataQualityScreen";
import { APIScreen } from "@/pages/screens/APIScreen";
import { AuditScreen } from "@/pages/screens/AuditScreen";
import { BillingScreen } from "@/pages/screens/BillingScreen";

export const ONBOARDING_DASHBOARD_KEY = "saha:onboarding:dashboard";
export const ONBOARDING_DATASOURCES_KEY = "saha:onboarding:datasources";
export const isOnboardingDismissed = (key: string) => {
  try { return localStorage.getItem(key) === "true"; } catch { return false; }
};
export const dismissOnboarding = (key: string) => {
  try { localStorage.setItem(key, "true"); } catch { /* ignore */ }
};

export type Screen = "dashboard" | "data-sources" | "ai-clients" | "data-quality" | "api" | "audit" | "billing";

export const NAV: { id: Screen; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "data-sources", label: "Data Sources", icon: Database },
  { id: "ai-clients", label: "AI Clients", icon: Sparkles },
  { id: "data-quality", label: "Data Quality", icon: ShieldCheck },
  { id: "api", label: "API / MCP", icon: Code2 },
  { id: "audit", label: "Audit", icon: ScrollText },
  { id: "billing", label: "Billing", icon: CreditCard },
];

export const SCREEN_LABEL: Record<Screen, string> = {
  dashboard: "Dashboard",
  "data-sources": "Data Sources",
  "ai-clients": "AI Clients",
  "data-quality": "Data Quality",
  api: "API / MCP",
  audit: "Audit",
  billing: "Billing",
};

export const SCREEN_TO_PATH: Record<Screen, string> = {
  dashboard: "/",
  "data-sources": "/data-sources",
  "ai-clients": "/ai-clients",
  "data-quality": "/data-quality",
  api: "/api",
  audit: "/audit",
  billing: "/billing",
};

export const PATH_TO_SCREEN: Record<string, Screen> = {
  "/": "dashboard",
  "/data-sources": "data-sources",
  "/ai-clients": "ai-clients",
  "/data-quality": "data-quality",
  "/api": "api",
  "/audit": "audit",
  "/billing": "billing",
};

export function LogoMark({ className = "h-6 w-6" }: { className?: string }) {
  return <img src={sahaMark} alt="ToolA" className={className} />;
}

export function LogoFull({ className }: { className?: string }) {
  return <Logo size="sidebar" className={className} />;
}


export function CodeBlock({ children }: { children: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md bg-muted/70 border border-border px-4 py-3 font-mono text-[13px] text-foreground">
      <span className="truncate">{children}</span>
      <button
        onClick={() => navigator.clipboard?.writeText(children)}
        className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
        aria-label="Copy"
      >
        <Copy className="h-4 w-4" />
      </button>
    </div>
  );
}

export function StatusBadge({ status }: { status: "Connected" | "Syncing" | "Setup" }) {
  const map = {
    Connected: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Syncing: "bg-amber-50 text-amber-700 border-amber-200",
    Setup: "bg-muted text-muted-foreground border-border",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${map[status]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${status === "Connected" ? "bg-emerald-500" : status === "Syncing" ? "bg-amber-500" : "bg-muted-foreground/60"}`} />
      {status}
    </span>
  );
}

export function Breadcrumb({ screen }: { screen: Screen }) {
  const { user } = useAuth();
  return (
    <div className="text-sm text-muted-foreground">
      <span>{workspaceName(user?.email)}</span>
      <span className="mx-2">›</span>
      <span className="text-foreground">{SCREEN_LABEL[screen]}</span>
    </div>
  );
}

/* -------------------- SIDEBAR -------------------- */

export function SidebarContents({ active, onNavigate }: { active: Screen; onNavigate?: () => void }) {
  const { user } = useAuth();
  const { orgId } = useUserOrg();
  const { count, loading: countLoading } = useOrgRecordCount(orgId);
  const navigate = useNavigate();
  const used = count ?? 0;
  const pct = Math.min(100, Math.round((used / RECORD_QUOTA) * 1000) / 10);
  const remaining = Math.max(0, RECORD_QUOTA - used);

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 pt-7 pb-5">
        <Logo size="sidebar" />
      </div>

      <div className="px-6 pb-6 space-y-6">

        <button className="w-full flex items-center justify-between rounded-md border border-border bg-card px-3 py-2.5 text-left hover:border-foreground/20 transition-colors">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-7 w-7 rounded bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium shrink-0">
              {workspaceInitial(user?.email)}
            </div>
            <div className="min-w-0">
              <div className="text-sm text-foreground truncate">{workspaceName(user?.email)}</div>
              <div className="text-[11px] text-muted-foreground truncate">ToolA Data Layer</div>
            </div>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        </button>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] uppercase tracking-widest text-muted-foreground">AI-ready kayıt</span>
            <span className="text-[11px] text-muted-foreground">
              {countLoading ? "…" : `${used.toLocaleString()} / ${RECORD_QUOTA.toLocaleString()}`}
            </span>
          </div>
          <div className="h-1 bg-muted rounded overflow-hidden">
            <div className="h-full bg-foreground transition-all" style={{ width: `${pct}%` }} />
          </div>
          <div className="text-[11px] text-muted-foreground mt-2">
            {countLoading ? "Yükleniyor…" : `${remaining.toLocaleString()} kayıt hakkı kaldı`}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-widest text-muted-foreground">Kredi</span>
            <button className="text-[11px] text-primary hover:underline">Kredi ekle</button>
          </div>
          <div className="font-serif text-3xl text-foreground mt-1">$0.00</div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-2 border-t border-border overflow-y-auto">
        <div className="text-[11px] uppercase tracking-widest text-muted-foreground px-3 py-3">Organization</div>
        <div className="space-y-0.5">
          {NAV.map((item) => {
            const Icon = item.icon;
            const isActive = active === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { navigate(SCREEN_TO_PATH[item.id]); onNavigate?.(); }}
                className={`relative w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                  isActive ? "bg-accent text-foreground font-medium" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                }`}
              >
                {isActive && <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r bg-primary" />}
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </div>
      </nav>

      <SidebarFooterUser />
    </div>
  );
}

export function Sidebar({ active }: { active: Screen }) {
  return (
    <aside className="hidden lg:flex w-[284px] fixed inset-y-0 left-0 border-r border-sidebar-border bg-sidebar flex-col">
      <SidebarContents active={active} />
    </aside>
  );
}

function SidebarFooterUser() {
  const { user, signOut } = useAuth();
  const email = user?.email ?? "";
  const initial = workspaceInitial(email);
  return (
    <div className="p-4 border-t border-border flex items-center gap-3">
      <div className="h-8 w-8 rounded bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium">{initial}</div>
      <div className="min-w-0 flex-1">
        <div className="text-sm text-foreground truncate">Account</div>
        <div className="text-[11px] text-muted-foreground truncate">{email}</div>
      </div>
      <button
        onClick={() => signOut()}
        title="Sign out"
        className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
      >
        <LogOut className="h-4 w-4" />
      </button>
    </div>
  );
}

export function MobileTopBar({ active, onMenu }: { active: Screen; onMenu: () => void }) {
  return (
    <div className="lg:hidden sticky top-0 z-30 flex items-center gap-3 h-14 px-4 border-b border-border bg-background/95 backdrop-blur">
      <button onClick={onMenu} className="p-2 -ml-2 rounded-md hover:bg-accent" aria-label="Open menu">
        <Menu className="h-5 w-5" />
      </button>
      <LogoFull className="h-6" />
      <span className="ml-auto text-xs text-muted-foreground">{SCREEN_LABEL[active]}</span>
    </div>
  );
}

/* -------------------- ROOT -------------------- */

export default function Index() {
  const location = useLocation();
  const active: Screen = PATH_TO_SCREEN[location.pathname] ?? "dashboard";
  const [showOnboarding, setShowOnboarding] = useState(() => !isOnboardingDismissed(ONBOARDING_DASHBOARD_KEY));
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    document.title = `ToolA — ${SCREEN_LABEL[active]}`;
  }, [active]);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar active={active} />

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0 w-[284px] sm:max-w-[284px] bg-sidebar">
          <SidebarContents active={active} onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <main className="lg:ml-[284px]">
        <MobileTopBar active={active} onMenu={() => setMobileOpen(true)} />
        <div className="max-w-[1280px] mx-auto px-6 lg:px-12 py-10 lg:py-14">
          {active === "dashboard" && <DashboardScreen showOnboarding={showOnboarding} onClose={() => { dismissOnboarding(ONBOARDING_DASHBOARD_KEY); setShowOnboarding(false); }} />}
          {active === "data-sources" && <DataSourcesScreen />}
          {active === "ai-clients" && <AIClientsScreen />}
          {active === "data-quality" && <DataQualityScreen />}
          {active === "api" && <APIScreen />}
          {active === "audit" && <AuditScreen />}
          {active === "billing" && <BillingScreen />}
        </div>
      </main>
    </div>
  );
}
