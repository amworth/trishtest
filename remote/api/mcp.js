/**
 * trishtest hosted MCP endpoint (streamable HTTP, stateless).
 *
 * POST /mcp per MCP streamable HTTP transport. Each request builds a fresh
 * server instance (serverless-friendly). Emails are scored in memory and
 * never stored; usage metering records metadata only (tool, score band,
 * fired signal ids). See trishtest.com.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { score, SIGNAL_GROUPS } from "../lib/scorer.js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

function surfaceFrom(req) {
  const ua = String(req.headers["user-agent"] || "").toLowerCase();
  if (ua.includes("openai") || ua.includes("chatgpt")) return "chatgpt";
  if (ua.includes("claude") || ua.includes("anthropic")) return "claude";
  return "other";
}

async function logUsage(row) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return;
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/trishtest_usage_events`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        prefer: "return=minimal",
      },
      body: JSON.stringify(row),
    });
  } catch {
    // metering must never break scoring
  }
}

function formatResult(r, mode) {
  const lines = [];
  if (mode === "preflight") {
    const stamp = r.score >= 0.55 ? "DO NOT SEND" : r.score >= 0.3 ? "NEEDS WORK" : "CLEAR TO SEND";
    lines.push(`${stamp}. Trish score ${r.score} (red starts at 0.55)`);
  } else {
    lines.push(`${r.verdict}. Trish score ${r.score} (red starts at 0.55)`);
  }
  if (r.signals.length) {
    lines.push("", "Fingerprints:");
    for (const s of r.signals) {
      lines.push(`- ${s.name} (+${s.weight}): ${s.evidence}`);
      if (mode === "preflight") lines.push(`  FIX: ${s.fix}`);
      if (s.matches?.length) lines.push(`  matched: ${s.matches.slice(0, 3).join(" · ")}`);
    }
  } else {
    lines.push("", "No automation fingerprints found.");
  }
  if (r.human_cues.length) lines.push("", `Human cues (count in favor): ${r.human_cues.join(", ")} (-${r.cue_penalty})`);
  if (r.gate < 1) lines.push(`Commercial-intent gate applied: x${r.gate} (${r.commercial_signals} commercial signal${r.commercial_signals === 1 ? "" : "s"})`);
  lines.push("", r.notes);
  return lines.join("\n");
}

const upgrade = (tool) => ({
  content: [{ type: "text", text:
    `${tool} runs on the paid Trish Test tier and needs an API key from trishtest.com. The scoring tools (trish_test, trish_preflight) are free.` }],
});

function buildServer(surface) {
  const server = new McpServer({ name: "trishtest", version: "0.2.0" });

  const emailArgs = {
    email: z.string().describe("Full email text: subject and body (headers welcome)"),
    sender: z.string().optional().describe("Sender email address (enables domain signals)"),
    recipient: z.string().optional().describe("Recipient email address (enables merge-field greeting check)"),
  };

  const scored = (mode) => async (args) => {
    const t0 = Date.now();
    const email = mode === "preflight" ? args.draft : args.email;
    const r = score({ email, sender: args.sender, recipient: args.recipient });
    await logUsage({
      tool: mode === "preflight" ? "trish_preflight" : "trish_test",
      surface,
      score: r.score,
      verdict: r.verdict,
      signals: r.signals.map((s) => s.id),
      commercial_signals: r.commercial_signals,
      gate: r.gate,
      latency_ms: Date.now() - t0,
      email_bytes: email.length,
    });
    return { content: [{ type: "text", text: formatResult(r, mode) }], structuredContent: r };
  };

  server.tool(
    "trish_test",
    "Run the Trish Test on an email you received: scores the structural fingerprints of automated sales sequences (fake bumps, phantom referrals, enrichment-database personalization, burner domains...). Returns a 0-1 Trish score, verdict, and every fired signal with the evidence. The email is scored in memory and never stored.",
    emailArgs,
    scored("test")
  );

  server.tool(
    "trish_preflight",
    "Preflight a cold-email DRAFT before it is sent (use this on any outreach email you or the user are writing). Same engine as trish_test, but the output is a fix list: every fired fingerprint with a specific rewrite instruction. An email that passes reads like it was written by a person, to a person. The draft is scored in memory and never stored.",
    { draft: z.string().describe("The draft email text (subject + body)"),
      sender: z.string().optional().describe("The address it will be sent from (enables domain signals)"),
      recipient: z.string().optional().describe("The address it will be sent to") },
    scored("preflight")
  );

  server.tool(
    "trish_spec",
    "Return the Trish Test scoring specification: every signal group with its weight, meaning, and fix guidance, plus the combination math. Useful when an LLM wants to act as a semantic judge beyond the regex tier, or to explain a verdict.",
    {},
    async () => {
      await logUsage({ tool: "trish_spec", surface });
      const spec = [
        "THE TRISH TEST scoring spec (trishtest.com)",
        "",
        "score = clamp( noisyOR(fired signal weights) * commercialGate - humanCuePenalty, 0, 1 )",
        "noisyOR: 1 - prod(1 - w_i). Gate: 0 commercial signals x0.35, 1 x0.80, 2+ x1.0.",
        "Human cues: first category -0.30, each additional -0.15, floor -0.55.",
        "Verdicts: >=0.55 TRISH DETECTED · 0.30-0.54 SMELLS LIKE TRISH · <0.30 PASSES.",
        "",
        "Signal groups:",
        ...SIGNAL_GROUPS.map((g) => `- ${g.name} (${g.weight}${g.commercial ? ", commercial" : ""}): ${g.evidence}`),
        "- Database personalization (0.30, commercial): enrichment-table fields recited as research.",
        "- Bonus: self-quoted thread 0.20 · merge-field artifact 0.25c · brand/domain mismatch 0.20c · burner TLD 0.10c · scheduling link 0.15c · lookalike domain 0.20c · outbound-branded domain 0.20c",
        "",
        "Human cues (negative): named referral, shared history, operational detail, personal register.",
        "Core thesis: the fingerprints are structural. The only way to remove them is to write a specific, honest email.",
      ].join("\n");
      return { content: [{ type: "text", text: spec }] };
    }
  );

  const stub = (name, args) =>
    server.tool(name, `${name} runs on the paid Trish Test tier. Requires an API key from trishtest.com.`, args, async () => {
      await logUsage({ tool: name, surface });
      return upgrade(name);
    });

  stub("trish_judge", emailArgs);
  stub("trish_rewrite", { draft: z.string(), context: z.string().optional() });
  stub("trish_certify", { sequence: z.array(z.string()) });

  return server;
}

export default async function handler(req, res) {
  if (req.method === "GET" && !String(req.headers.accept || "").includes("text/event-stream")) {
    res.status(200).json({
      name: "trishtest",
      protocol: "mcp/streamable-http",
      message: "POST MCP requests to this endpoint. Free tools: trish_test, trish_preflight, trish_spec. trishtest.com",
    });
    return;
  }
  try {
    const server = buildServer(surfaceFrom(req));
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    res.on("close", () => { transport.close(); server.close(); });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    console.error("mcp handler error", err);
    if (!res.headersSent) {
      res.status(500).json({ jsonrpc: "2.0", error: { code: -32603, message: "Internal server error" }, id: null });
    }
  }
}
