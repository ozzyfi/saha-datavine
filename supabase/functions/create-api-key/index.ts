// Server-side API key generation. Returns raw key ONCE.
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

async function sha256Hex(input: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => null);
    const name = body?.name ? String(body.name).trim() : "";
    const org_id = body?.org_id ? String(body.org_id) : "";
    if (!name || !org_id) return json({ error: "Missing 'name' or 'org_id'" }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: isMember, error: memErr } = await admin.rpc("is_org_member", {
      _user_id: user.id,
      _org_id: org_id,
    });
    if (memErr) return json({ error: memErr.message }, 500);
    if (!isMember) return json({ error: "Forbidden" }, 403);

    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    const random = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    const raw = `saha_${random}`;
    const hash = await sha256Hex(raw);
    const preview = `${raw.slice(0, 10)}...`;

    const { error: insErr } = await admin.from("api_keys").insert({
      org_id,
      name,
      key_hash: hash,
      key_preview: preview,
    });
    if (insErr) return json({ error: insErr.message }, 500);

    return json({ key: raw, preview });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
