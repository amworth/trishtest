#!/usr/bin/env node
/**
 * trishtest-mcp: The Trish Test as an MCP server.
 *
 * Free, local tools (nothing leaves the machine):
 *   trish_test       score a received email
 *   trish_preflight  score a draft before sending, with a fix list
 *   trish_spec       the scoring spec, for LLMs acting as judges
 *
 * Hosted tools (require TRISHTEST_API_KEY; coming soon):
 *   trish_judge, trish_rewrite, trish_certify
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { score, SIGNAL_GROUPS } from "./lib/scorer.js";

const server = new McpServer({ name: "trishtest", version: "0.1.4" });

const emailArgs = {
  email: z.string().describe("Full email text: subject and body (headers welcome)"),
  sender: z.string().optional().describe("Sender email address (enables domain signals)"),
  recipient: z.string().optional().describe("Recipient email address (enables merge-field greeting check)"),
};

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

server.tool(
  "trish_test",
  "Run the Trish Test on an email you received: scores the structural fingerprints of automated sales sequences (fake bumps, phantom referrals, enrichment-database personalization, burner domains...). Returns a 0-1 Trish score, verdict, and every fired signal with the evidence. Runs entirely locally.",
  emailArgs,
  async (args) => {
    const r = score(args);
    return { content: [{ type: "text", text: formatResult(r, "test") }],
             structuredContent: r };
  }
);

server.tool(
  "trish_preflight",
  "Preflight a cold-email DRAFT before it is sent (use this on any outreach email you or the user are writing). Same engine as trish_test, but the output is a fix list: every fired fingerprint with a specific rewrite instruction. An email that passes reads like it was written by a person, to a person. Runs entirely locally.",
  { draft: z.string().describe("The draft email text (subject + body)"),
    sender: z.string().optional().describe("The address it will be sent from (enables domain signals)"),
    recipient: z.string().optional().describe("The address it will be sent to") },
  async ({ draft, sender, recipient }) => {
    const r = score({ email: draft, sender, recipient });
    return { content: [{ type: "text", text: formatResult(r, "preflight") }],
             structuredContent: r };
  }
);

server.tool(
  "trish_spec",
  "Return the Trish Test scoring specification: every signal group with its weight, meaning, and fix guidance, plus the combination math. Useful when an LLM wants to act as a semantic judge beyond the regex tier, or to explain a verdict.",
  {},
  async () => {
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

// ---- hosted tools (paid tier seam) ----------------------------------------

const upgrade = (tool) => ({
  content: [{ type: "text", text:
    `${tool} runs on the hosted Trish Test engine (semantic judge + continuously updated signals from the specimen library) and needs a TRISHTEST_API_KEY environment variable. Keys aren't generally available yet. Join the list at trishtest.com. The local tools (trish_test, trish_preflight) are free forever.` }],
});

const hasKey = () => Boolean(process.env.TRISHTEST_API_KEY);

server.tool(
  "trish_judge",
  "Semantic second-stage judgment on an email the regex tier scored amber or that you suspect despite a low score. Hosted; requires TRISHTEST_API_KEY.",
  emailArgs,
  async () => hasKey()
    ? { content: [{ type: "text", text: "Hosted judge not yet reachable in this preview build." }] }
    : upgrade("trish_judge")
);

server.tool(
  "trish_rewrite",
  "Rewrite a failing draft so it passes the Trish Test, preserving the sender's real context and intent. Hosted; requires TRISHTEST_API_KEY.",
  { draft: z.string(), context: z.string().optional().describe("What the sender actually knows about this recipient and the real reason for writing") },
  async () => hasKey()
    ? { content: [{ type: "text", text: "Hosted rewrite not yet reachable in this preview build." }] }
    : upgrade("trish_rewrite")
);

server.tool(
  "trish_certify",
  "Certify a passing sequence and get a public verification URL for the 'Passes the Trish Test' badge. Hosted; requires TRISHTEST_API_KEY.",
  { sequence: z.array(z.string()).describe("Every email step in the sequence") },
  async () => hasKey()
    ? { content: [{ type: "text", text: "Hosted certification not yet reachable in this preview build." }] }
    : upgrade("trish_certify")
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("trishtest-mcp ready (local scoring; nothing leaves this machine)");
