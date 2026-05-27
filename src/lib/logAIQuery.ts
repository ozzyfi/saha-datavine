import { supabase } from "@/lib/supabase";

interface LogParams {
  orgId: string | null;
  ai_client?: string;
  query_text: string;
  sources_accessed?: string[];
}

/**
 * Fire-and-forget audit log to ai_queries.
 * Errors are swallowed to never break the calling fetch.
 */
export async function logAIQuery({ orgId, ai_client = "Platform", query_text, sources_accessed = [] }: LogParams) {
  if (!orgId) return;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("ai_queries").insert({
      org_id: orgId,
      user_id: user?.id ?? null,
      ai_client,
      query_text,
      sources_accessed,
    });
  } catch {
    // ignore — audit logging must not break the app
  }
}
