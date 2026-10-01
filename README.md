# The Trish Test

**Does this email read like it was written *to* you, or *at* you?**

The Trish Test scores emails for the structural fingerprints of automated sales sequences: fake bumps, phantom referrals, enrichment-database "personalization," right-person routing questions, burner domains. It is not an AI detector. It reads structure, not intent, and the fingerprints are structural: the only way to remove them from an email is to write a specific, honest one. Which is the point.

Try it: **[trishtest.com](https://trishtest.com)**

## One engine, four surfaces

| Surface | Where | Privacy model |
|---|---|---|
| The site | [trishtest.com](https://trishtest.com) | scores in your browser; nothing leaves it |
| npm package | `npx trishtest-mcp` ([npm](https://www.npmjs.com/package/trishtest-mcp)) | local MCP server; nothing leaves your machine |
| Hosted MCP endpoint | `https://trishtest-mcp.vercel.app/mcp` | scored in memory, never stored; metadata-only metering |
| Prompt-native skill | [`package/SKILL.md`](package/SKILL.md) | wherever you paste it |

All surfaces run the same engine, verified against a pinned regression suite of real-world specimens (19/19 verdict-and-score parity between the reference implementation and this port).

## The engine improves continuously

Every new specimen that slips through gets triaged: the miss is diagnosed, a pattern is added, the full regression suite re-runs (every pinned specimen must keep its verdict; weights never change to make a test pass), and the specimen is pinned. The site and the hosted endpoint pick up new signals on deploy. The npm package picks them up on release: run `npx trishtest-mcp@latest` to stay current.

## How scoring works

Each fired signal group carries a weight; they combine by noisy-OR (`1 - prod(1 - w)`), pass through a commercial-intent gate (an email that isn't selling anything can't score red on tone alone), and human cues (named referrals, shared history, operational detail) earn points back. Verdicts: >= 0.55 TRISH DETECTED, 0.30-0.54 SMELLS LIKE TRISH, < 0.30 PASSES. Full spec: call the `trish_spec` tool, or read [`package/SKILL.md`](package/SKILL.md).

## Repository layout

- [`package/`](package/): the npm package (`trishtest-mcp`), a local stdio MCP server.
- [`remote/`](remote/): the hosted streamable-HTTP MCP endpoint (Vercel). Used by ChatGPT apps and anything that needs a remote server. Logs metadata only (tool, score, fired signal ids); email content is never stored.

The pinned specimen dataset is not in this repository: specimens are real emails received by real inboxes, and the internal set keeps original identities. Public verification cases on the site use fictionalized senders.

## Hosted vs local

`trish_judge`, `trish_rewrite`, and `trish_certify` run on the hosted tier and need an API key from [trishtest.com](https://trishtest.com). The scoring tools are free everywhere, and the local package stays free forever.

## License

MIT. The Trish Test name and specimen library: trishtest.com.
