---
name: trish-test
description: Score any email for the structural fingerprints of automated sales sequences, or preflight an outreach draft before sending. Use when the user pastes a suspicious email, asks "is this spam/AI/a sequence?", or is writing cold outreach.
---

# The Trish Test (prompt-native judge)

You are applying the Trish Test (trishtest.com): does this email read like it was written **to** the recipient, or **at** them?

If the `trishtest` MCP server is available, call `trish_test` (received email) or `trish_preflight` (draft) and relay its verdict. Otherwise, judge semantically using the spec below. You are the stage-2 judge, and you may flag *paraphrases* of these fingerprints, not just literal phrases.

## Fingerprints (positive signals)

| Signal | Weight | Commercial | The tell |
|---|---|---|---|
| Fake bump | 0.30 | no | "just following up", "didn't get buried", "if you're swamped…", "will touch base later". A timer fired |
| Meeting-slot ask | 0.20 | no | minutes/moments + weekdays; time requested before value given |
| Soft opt-out | 0.25 | yes | any opt-out mechanics, incl. "reply 'not interested'", breakup closers ("reply 'no' and I'll close the file", "I'll stop reaching out") |
| Bulk-mail footer | 0.35 | yes | unsubscribe, view-in-browser |
| Vague value tease | 0.25 | yes | big numbers with no evidence; "companies like yours"; leadgen promises ("4-8 clients a month"); borrowed-logo proof ("helped X sign Y for five-figure contracts"); "put you in front of N decision-makers" |
| Phantom referral | 0.25 | no | "your name came up": social proof with no named source |
| Database personalization | 0.30 | yes | enrichment fields recited as research (founding year, HQ, headcount, legal suffix "…, Inc."); AI-sycophancy praise; claimed personalization ("we write to each personally"); ICP title lists |
| Fact-to-pain pivot | 0.25 | yes | scraped fact + generalizer ("usually", "many teams") + universal pain |
| "I help" formula | 0.15 | yes | bio-template intros ("I help X do Y so Z", "my name is… and I serve as") |
| Template formalese | 0.15 | no | "hope this finds you well", "by way of introduction", "thought I'd reach out" |
| Reply bait | 0.10 | no | "open to a short reply?", "keen to hear more?", "can I send over more info?", no-strings asset dangles |
| Right-person routing | 0.20 | yes | "are you in charge of X?", "who's the right person for...": qualification questions that route you into a sequence; any answer confirms a live inbox |

Bonus (need sender/recipient): self-quoted thread 0.20 · merge-field artifact (broken tokens, mismatched greeting) 0.25c · brand/domain mismatch 0.20c · burner TLD (.info/.xyz/…) 0.10c · scheduling link in first touch 0.15c · lookalike sending domain (mycinnova.com linking cinnova.com) 0.20c · outbound-jargon domain (replyconvert.co) 0.20c

## Scoring

1. Each fired group counts once: `combined = 1 − Π(1 − wᵢ)`.
2. Commercial gate: 0 commercial signals ×0.35 · 1 ×0.80 · 2+ ×1.0. (A colleague saying "just following up" can never red; nothing is being sold.)
3. Human cues subtract: named referral, shared history, operational detail (invoice, ticket, deploy…), personal register. First category −0.30, each additional −0.15, floor −0.55.
4. Verdict: ≥0.55 **TRISH DETECTED** · 0.30–0.54 **SMELLS LIKE TRISH** · <0.30 **PASSES**.

## Output

Give the verdict, the approximate score, then each fired fingerprint with the exact quoted line that fired it. For drafts, add a FIX per fingerprint that always points toward specificity and honesty (name the referrer, replace the tease with a checkable number, delete the bump, send from the real domain). End with the caveat: structure is scored, not intent; a low score doesn't certify honesty.

The core thesis, if asked: the fingerprints are structural. The only way to remove them is to write a specific, honest email. Which is the point.
