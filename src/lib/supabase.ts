// Resilient Supabase client.
// In dev/preview, env vars are injected by the platform.
// On some published deployments env vars may be missing from the build —
// fall back to the project's public anon key (safe to ship in client code).
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const FALLBACK_URL = "https://dcjbqtsjnsheneinctea.supabase.co";
const FALLBACK_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjamJxdHNqbnNoZW5laW5jdGVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4Nzk1MzMsImV4cCI6MjA5NTQ1NTUzM30.Vq-66yk0dE3xKRSkujM6gMgyi4cJb66JfkDKdj1sNFA";

const url = import.meta.env.VITE_SUPABASE_URL || FALLBACK_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || FALLBACK_KEY;

export const supabase = createClient<Database>(url, key, {
  auth: {
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
  },
});
