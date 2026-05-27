// Streams AI response over Lovable AI Gateway and logs to ai_queries.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { query, orgId, workflow } = await req.json();
    if (!query || typeof query !== "string" || !orgId) {
      return new Response(JSON.stringify({ error: "Missing query or orgId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Try semantic retrieval via pgvector; fall back to recency on failure.
    let records: any[] | null = null;
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (openaiKey) {
      try {
        const embRes = await fetch("https://api.openai.com/v1/embeddings", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openaiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ model: "text-embedding-3-small", input: query }),
        });
        if (!embRes.ok) throw new Error(`embedding ${embRes.status}`);
        const embJson = await embRes.json();
        const queryEmbedding = embJson.data[0].embedding as number[];
        const { data: matched, error: matchErr } = await supabase.rpc("match_field_records", {
          _org_id: orgId,
          _user_id: user.id,
          _embedding: queryEmbedding as unknown as string,
          _match_count: 20,
        });
        if (matchErr) throw matchErr;
        records = matched ?? [];
      } catch (e) {
        console.error("Semantic retrieval failed, falling back to recency:", e);
      }
    }

    if (!records) {
      const { data: recent } = await supabase
        .from("field_records")
        .select("id, topic, location, status, raw_text, root_cause, resolution, action_required, quality_score, created_at")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false })
        .limit(20);
      records = recent ?? [];
    }

    const contextBlock = (records ?? [])
      .map((r, i) =>
        `#${i + 1} [${r.status}] ${r.topic ?? "(no topic)"} @ ${r.location ?? "—"}\n` +
          `  created: ${r.created_at}\n` +
          (r.raw_text ? `  text: ${r.raw_text}\n` : "") +
          (r.root_cause ? `  root_cause: ${r.root_cause}\n` : "") +
          (r.resolution ? `  resolution: ${r.resolution}\n` : "") +
          (r.action_required ? `  action: ${r.action_required}\n` : "") +
          (r.quality_score != null ? `  quality: ${r.quality_score}\n` : ""),
      )
      .join("\n");

    const system =
      `You are saha.team's field memory assistant. Answer concisely using ONLY the provided field records as evidence. ` +
      `If the records don't contain the answer, say so plainly. Workflow context: ${workflow ?? "General Search"}.`;
    const userMsg =
      `Question: ${query}\n\n--- Last ${records?.length ?? 0} field records ---\n${contextBlock || "(no records)"}`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        stream: true,
        messages: [
          { role: "system", content: system },
          { role: "user", content: userMsg },
        ],
      }),
    });

    if (!aiRes.ok || !aiRes.body) {
      const txt = await aiRes.text();
      const status = aiRes.status === 429 || aiRes.status === 402 ? aiRes.status : 500;
      return new Response(JSON.stringify({ error: `AI gateway error: ${txt}` }), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log audit row (fire-and-forget)
    supabase
      .from("ai_queries")
      .insert({
        org_id: orgId,
        user_id: user.id,
        ai_client: "Claude",
        query_text: query,
        sources_accessed: ["field_records"],
      })
      .then(() => {});

    // Transform OpenAI-style SSE to plain text token stream
    const reader = aiRes.body.getReader();
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();
    let buffer = "";

    const stream = new ReadableStream({
      async pull(controller) {
        const { value, done } = await reader.read();
        if (done) {
          controller.close();
          return;
        }
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const data = trimmed.slice(5).trim();
          if (data === "[DONE]") {
            controller.close();
            return;
          }
          try {
            const json = JSON.parse(data);
            const delta = json.choices?.[0]?.delta?.content;
            if (delta) controller.enqueue(encoder.encode(delta));
          } catch {
            // ignore partials
          }
        }
      },
    });

    return new Response(stream, {
      headers: { ...corsHeaders, "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
