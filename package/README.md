# trishtest-mcp

**The [Trish Test](https://trishtest.com) for your AI.** An MCP server that scores any email for the structural fingerprints of automated sales sequences (fake bumps, phantom referrals, enrichment-database "personalization", burner domains) and preflights outreach drafts before they're sent.

Everything scores **locally, on your machine**. No account, no telemetry, nothing leaves the device.

## Why put this in your AI?

Because your AI is where email happens now. An assistant that triages your inbox can call `trish_test` on anything suspicious. An assistant that *drafts* your outreach can call `trish_preflight` on its own draft and fix it before you ever see it: a self-correcting loop that ships emails written to a person instead of at one.

The original Trish scores **0.77**. Red starts at **0.55**. Honest email scores **0**.

## Install

```bash
npx trishtest-mcp
```

**Claude Desktop / Claude Code** (`claude mcp add trishtest -- npx trishtest-mcp`), or add to your MCP config:

```json
{
  "mcpServers": {
    "trishtest": { "command": "npx", "args": ["trishtest-mcp"] }
  }
}
```

Works the same in Cursor, Windsurf, and any MCP-capable client.

## Tools

| Tool | What it does | Where it runs |
|---|---|---|
| `trish_test` | Score a received email; verdict + every fired fingerprint with evidence | local, free |
| `trish_preflight` | Score a draft; DO NOT SEND / NEEDS WORK / CLEAR TO SEND + per-signal FIX list | local, free |
| `trish_spec` | The full scoring spec, so an LLM can act as a semantic judge or explain a verdict | local, free |
| `trish_judge` | Stage-2 semantic judgment beyond the regex tier | hosted, `TRISHTEST_API_KEY` |
| `trish_rewrite` | Rewrite a failing draft so it passes, keeping the sender's real context | hosted, `TRISHTEST_API_KEY` |
| `trish_certify` | Certify a passing sequence; public verification URL for the badge | hosted, `TRISHTEST_API_KEY` |

Hosted keys aren't generally available yet; the waitlist is at [trishtest.com](https://trishtest.com).

## How scoring works

Each fired signal group carries a weight; they combine by noisy-OR (`1 − Π(1−wᵢ)`), pass through a commercial-intent gate (an email that isn't selling anything can't red on tone alone), and human cues (named referrals, shared history, operational detail) earn points back. Full spec: call `trish_spec`, or see the site.

The engine is verified against a pinned regression suite of real-world specimens (19/19 verdict-and-score parity with the reference implementation). The fingerprints are structural: the only way to remove them from an email is to write a specific, honest one. Which is the point.

## What this can and can't tell you

We read structure, not intent. A high score means the email is built like a bulk sequence; the shape is measurable. A low score means nothing looks templated; it doesn't mean the sender is honest. No model calls, no database, no lookup of who sent it.

## License

MIT. The Trish Test name and specimen library: trishtest.com.
