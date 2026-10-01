# Deploying the hosted endpoint

This folder deploys to Vercel as-is (framework: none). The function at `api/mcp.js` serves the MCP streamable-HTTP endpoint; `vercel.json` rewrites `/mcp` to it.

Usage metering writes metadata-only rows (tool, score, verdict, fired signal ids, latency) to a Supabase table via an insert-only key. Email content is never stored. Set `SUPABASE_URL` and `SUPABASE_ANON_KEY` env vars to point at your own table, or remove `logUsage` entirely.
