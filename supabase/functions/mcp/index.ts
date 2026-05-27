// MCP tool endpoint authenticated via API key (SHA-256 of raw key).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function embedText(text: string): Promise<number[] | null> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) return null;
  try {
    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: "text-embedding-3-small", input: text }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return (data?.data?.[0]?.embedding as number[]) ?? null;
  } catch {
    return null;
  }
}

async function sha256Hex(input: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const auth = req.headers.get("Authorization") ?? "";
    if (!auth.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const rawKey = auth.slice(7).trim();
    if (!rawKey) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const keyHash = await sha256Hex(rawKey);
    const { data: keyRow, error: keyErr } = await admin
      .from("api_keys")
      .select("id, org_id, is_active")
      .eq("key_hash", keyHash)
      .maybeSingle();

    if (keyErr || !keyRow || !keyRow.is_active) {
      return json({ error: "Invalid or inactive API key" }, 401);
    }

    const orgId: string = keyRow.org_id;

    // Update last_used_at (fire-and-forget)
    admin.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", keyRow.id).then(() => {});

    const body = await req.json().catch(() => null);
    if (!body || typeof body.tool !== "string") return json({ error: "Invalid body" }, 400);
    const { tool, params = {} } = body;

    switch (tool) {
      case "search_field_memory": {
        const q = String(params.query ?? "").trim();
        if (!q) return json({ error: "Missing 'query' param" }, 400);

        const embedding = await embedText(q);
        if (embedding) {
          const { data: matched, error: matchErr } = await admin.rpc("match_field_records", {
            _org_id: orgId,
            _user_id: null,
            _embedding: embedding as unknown as string,
            _match_count: 20,
          });
          if (!matchErr && matched && matched.length > 0) {
            return json({ result: matched, search_method: "semantic" });
          }
        }

        const like = `%${q}%`;
        const { data, error } = await admin
          .from("field_records")
          .select("id, topic, raw_text, location, status, created_at, root_cause, resolution")
          .eq("org_id", orgId)
          .or(`topic.ilike.${like},raw_text.ilike.${like},location.ilike.${like}`)
          .order("created_at", { ascending: false })
          .limit(20);
        if (error) return json({ error: error.message }, 500);
        return json({ result: data, search_method: "keyword" });
      }


      case "get_asset_history": {
        const code = String(params.asset_code ?? "").trim();
        if (!code) return json({ error: "Missing 'asset_code' param" }, 400);
        const { data: asset, error: aErr } = await admin
          .from("assets")
          .select("id")
          .eq("org_id", orgId)
          .eq("code", code)
          .maybeSingle();
        if (aErr) return json({ error: aErr.message }, 500);
        if (!asset) return json({ error: "Asset not found" }, 404);
        const { data, error } = await admin
          .from("field_records")
          .select("*")
          .eq("org_id", orgId)
          .eq("asset_id", asset.id)
          .order("created_at", { ascending: false });
        if (error) return json({ error: error.message }, 500);
        return json({ result: data });
      }

      case "list_missing_evidence": {
        const { data, error } = await admin
          .from("field_records")
          .select("*")
          .eq("org_id", orgId)
          .eq("status", "closed")
          .or("root_cause.is.null,evidence_urls.eq.{}")
          .order("created_at", { ascending: false })
          .limit(100);
        if (error) return json({ error: error.message }, 500);
        return json({ result: data });
      }

      case "create_followup_task": {
        const topic = params.topic ? String(params.topic) : null;
        const location = params.location ? String(params.location) : null;
        const action_required = params.action_required ? String(params.action_required) : null;
        const { data, error } = await admin
          .from("field_records")
          .insert({
            org_id: orgId,
            source: "manual",
            status: "open",
            topic,
            location,
            action_required,
          })
          .select()
          .single();
        if (error) return json({ error: error.message }, 500);
        const embedUrl = Deno.env.get("SUPABASE_URL") + "/functions/v1/embed-record";
        fetch(embedUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
          },
          body: JSON.stringify({ record_id: data.id }),
        }).catch(() => {});
        return json({ result: data });
      }

      default:
        return json({ error: `Unknown tool: ${tool}` }, 400);
    }
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
