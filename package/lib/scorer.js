/**
 * The Trish Test, reference scoring engine (JavaScript port).
 * Kept in verdict-parity with the Python reference and trishtest.com.
 *
 * score = clamp( noisyOR(signals) * commercialGate - humanCuePenalty, 0, 1 )
 * Verdicts: >=0.55 TRISH DETECTED · 0.30-0.54 SMELLS LIKE TRISH · <0.30 PASSES
 *
 * Everything runs locally. Nothing leaves the machine.
 */

const G = (id, name, weight, commercial, evidence, fix, patterns, flags = "i") => ({
  id, name, weight, commercial, evidence, fix,
  patterns: patterns.map((p) => new RegExp(p, flags)),
});

export const SIGNAL_GROUPS = [
  G("fake_bump", "Fake bump", 0.30, false,
    "A bump adds no information. It tells the reader a timer fired, not that you thought about them.",
    "Delete the bump. If the first email deserved a reply it still does, send a genuinely new email with a new reason, or send nothing.",
    [
      "didn'?t get buried", "just wanted to make sure", "floating this back",
      "bubbling this (back )?up", "top of your inbox", "just following up",
      "circling back", "circle back", "wanted to bump", "in case you missed",
      "my last (email|note|message)", "following up on my",
      "still on the (edge|fence)", "still (thinking|considering|weighing|mulling)",
      "any thoughts on my", "did you (get|see|catch) my (last|previous|earlier)",
      "touch base (later|again|soon|sometime)",
      "if you('re| are) (swamped|busy|slammed|tied up|in the middle of)",
      "will (reach out|try you|check in) (again|later|next)",
    ]),
  G("meeting_ask", "Meeting-slot ask", 0.20, false,
    "Asking for time before you've said anything useful puts the cost on them and the upside on you.",
    "Ask a question they can answer in one line instead of asking for time. Earn the meeting with the reply.",
    [
      "(few|15|10|20) minutes?", "(few|couple of?) moments",
      "up for a (few|quick|brief|short)",
      "brief (chat|call)", "quick (chat|call)",
      "(brief |short )?introductory (conversation|call|meeting)",
      "set up a (brief|short|quick)",
      "\\d{1,2}[- ]minute (call|chat|meeting)",
      "(would|does) a [^.\\n]{0,25}(call|chat|meeting) make sense",
      "(monday|tuesday|wednesday|thursday|friday) or (monday|tuesday|wednesday|thursday|friday)",
      "hop on a call", "grab (some )?time",
    ]),
  G("soft_opt_out", "Soft opt-out", 0.25, true,
    "The escape hatch is an admission that this went to hundreds of people.",
    "Remove the opt-out line. If you need one for compliance, you're sending bulk, shrink the list until you don't.",
    [
      "rather not (to )?(receive|hear|get)", "just let me know",
      "let me know if you'?d like to be removed", "not the right person",
      "reply stop", "if this isn'?t relevant",
      "any more (e-?mails?|mails?|messages|emails)",
      "do not (want|wish) to receive",
      "any future [^.\\n]{0,50}(e-?mails?|messages|opportunities)",
      "(reply|respond)[^.\\n]{0,40}[‘’'\"]?opt[- ]?out",
      "type [‘’'\"]?opt[- ]?out",
      "send a quick [‘’'\"“]?(not interested|no)",
      "(reply|respond)[^.\\n]{0,20}[‘’'\"“]?not interested",
      "so i know not to (bother|keep bothering|follow up with) you",
      "(reply|respond)[^.\\n]{0,20}[‘’'\"“]no[’'\"”]",
      "close (out )?(the|your|this) file",
      "i(?:'?ll| will) (?:stop|quit) (?:reaching out|following up|emailing)",
      "won'?t (?:reach out|follow up|email(?: you)?) again",
    ]),
  G("bulk_footer", "Bulk-mail footer", 0.35, true,
    "An unsubscribe link is the closest thing to a signed confession of bulk.",
    "One-to-one email doesn't carry list machinery. If it must, this isn't one-to-one email.",
    [
      "\\bunsubscribe\\b",
      "(text|reply) ['\"]?stop['\"]? to (opt out|end|unsubscribe)",
      "view (this email )?in (your )?browser",
    ]),
  G("vague_value", "Vague value tease", 0.25, true,
    "Big numbers, zero specifics, because they don't know anything specific about you.",
    "Replace the tease with one concrete number attached to a named situation: what changed, for whom, over what period.",
    [
      "results we'?re (producing|getting|seeing)", "numbers we'?re getting",
      "kinds? of results", "\\$?\\d{2,3}k\\b", "\\d{2,3}% (increase|growth|more)",
      "before (year|quarter) end", "no charge (on this )?until",
      "companies like yours", "others in your (space|industry)",
      "\\d+\\+? (investors|vcs|angels|buyers|clients|customers|leads)",
      "write (their|a) next check", "warm (network|intro)",
      "are you (currently |in the process of )?(raising|looking to raise)",
      "not sure if [^.\\n]{0,40}on your radar", "if it ever is\\b",
      "weighing whether to (sell|raise|exit)",
      "predictable (flow|stream|pipeline) of (new business|leads|meetings|revenue)",
      "without (adding|hiring) (headcount|more (people|reps|staff))",
      "\\d+\\+? (million|billion)\\b[^.\\n]{0,50}(delivered|funded|deployed|raised|closed|generated)",
      "no (hard pulls?|collateral|credit check|upfront cost|obligation)",
      "delivered to (owners|founders|businesses)",
      "just curious if",
      "(ever )?in need of [^.\\n]{0,30}(capital|funding|financing)",
      "(business|working) capital", "equipment financing",
      "(learn more about|review) your (organization|capabilities|company)",
      "(suitable|potential|possible) fit\\b",
      "(companies|firms|vendors) best positioned",
      "your (background|profile|experience) (matches|aligns|stood out|is a (great|good|strong) (fit|match))",
      "(board|advisory) (seat|position|opportunit)",
      "private capital (sources|partners|groups)",
      "ready to scale",
      "(most|our) clients (find|see|save|tell)",
      "more cost-effective than",
      "(would you consider|open to) (capitalizing|refinancing|restructuring)",
      "if the (structure|terms|numbers) fit",
      "\\d+[-\\u2013]\\d+ [^.\\n]{0,25}(clients|meetings|calls|leads|deals) (a|per) (month|week)",
      "high[- ]ticket",
      "rev(enue)?[- ]share",
      "take care of everything",
      "all you (have|need) to do is",
      "proprietary deal ?flow",
      "(lower|upper) middle[- ]market",
      "succession (signals|planning)",
      "(five|six|seven|5|6|7)[- ]figure",
      "put you in front of [^.\\n]{0,40}(decision[- ]makers?|buyers?|prospects?|founders|ceos?|executives?)",
      "helped [^.\\n]{0,60}(sign|land|close|book|win) [^.\\n]{0,60}(contracts?|clients?|deals?|accounts?)",
      "within the first \\d+ days",
    ]),
  G("phantom_referral", "Phantom referral", 0.25, false,
    "'Your name came up in conversation.' With whom? A real referral has a name attached.",
    "Name the referrer or delete the line. Unverifiable social proof reads as fabricated.",
    [
      "your name (specifically )?(came up|was (mentioned|recommended|suggested))",
      "came up in (a )?conversation",
      "(someone|a (mutual )?(connection|contact|friend|colleague)) (mentioned|suggested|recommended) (you|your)",
      "you (were|came) (highly )?recommended\\b(?![^.\\n]{0,30}by [A-Z])",
    ]),
  G("fact_to_pain", "Fact-to-pain pivot", 0.25, true,
    "A scraped fact, a generalizer, and a pain point that fits anyone. That's the template seam.",
    "Drop 'usually'. Ask about their actual situation, or state a pain you can prove they have.",
    [
      "(firms|companies|teams|businesses|founders|leaders) (like|with|of|at) (that|this|your|yours)[^.\\n]{0,80}(usually|typically|often|tend to|struggle|get hit)",
      "(usually|typically|often) (get hit with|struggle with|end up|find themselves)",
      "for a (firm|company|team|business) like",
      "(a good|the) first step is (usually|typically|often)",
      "(many|most) (teams|companies|firms|businesses|leaders|founders) (are|still|struggle|rely|find themselves|sit)",
      "still relying on",
      "for [a-z]+( companies| businesses| firms| brands| teams)? like [A-Z]",
    ]),
  G("i_help_formula", "The 'I help' formula", 0.15, true,
    "'I help [audience] do [thing] so [outcome]', the LinkedIn bio, pasted into an email.",
    "Rewrite your intro in words you'd say out loud to a stranger.",
    [
      "\\bi help [^.\\n]{5,80}\\b(so|by|without)\\b",
      "\\bwe help [^.\\n]{5,80}\\b(so|by|without)\\b",
      "\\bwe help (teams|companies|firms|businesses|leaders|founders|clients|owners)\\b",
      "\\bwe help ([a-z]+ ){1,3}(teams|companies|firms|businesses|sponsors|founders|owners|operators)\\b",
      "\\band now i (run|lead|operate)\\b",
      "that'?s something i can help with",
      "my name is [A-Z][a-z]+[^.\\n]{0,30}i (serve as|am the|run|lead)",
    ]),
  G("template_formalese", "Template formalese", 0.15, false,
    "Boilerplate courtesy at machine density. Real formality varies; templates don't.",
    "Cut the boilerplate courtesies. Get to the point, formality isn't warmth.",
    [
      "hope this (note|email|message)? ?(finds|reaches) you well",
      "by way of introduction",
      "i look forward to (your reply|hearing from you)",
      "please do not hesitate",
      "so (i )?thought i'?d reach out",
    ]),
  G("reply_bait", "Reply bait", 0.10, false,
    "The no-strings offer is step 1 of a sequence. Step 2 already exists.",
    "Attach or link the asset now instead of dangling it for a reply.",
    [
      "open to a (short|quick|brief) reply",
      "worth a (short|quick|brief) reply",
      "(if (it'?s|this is)n'?t useful[^.\\n]{0,40}anyway)",
      "i'?ll (leave|send) (you|it)[^.\\n]{0,30}(either way|anyway)",
      "keen to (hear|learn|know|chat) more",
      "if (useful|helpful|interested),? (just )?reply",
      "reply and i('ll| can| will) (share|send|walk)",
      "can i (send|share|shoot) (over |you )?(more|some|a bit more) (info|information|details?)",
    ]),
  G("routing_ask", "Right-person routing", 0.20, true,
    "A qualification question routes you into a sequence. Any answer, including a redirect, confirms a live inbox and feeds the machine.",
    "If you know they're the right person, say why you know. If you don't, do the research; don't outsource it to their inbox.",
    [
      "are you (still )?(in charge of|responsible for|the (right|best) (person|one|contact))",
      "who (would be|is) the (right|best) (person|contact)",
      "(point|direct) me (to|toward) the right (person|direction)",
    ]),
];

// Enrichment recital: mixed-case-sensitivity group handled specially.
const ENRICHMENT = G("enrichment", "Database personalization", 0.30, true,
  "Your founding year and headcount aren't research. They're columns in an enrichment table.",
  "If your 'research' came from an enrichment column, cut it. Reference something a database can't know.",
  [
    "i (saw|noticed|see|came across) (that )?[^.\\n]{0,60}(has been|have been|is|are|was|were)[^.\\n]{0,60}(since (19|20)\\d\\d|family-owned|founded|headquartered|based in)",
    "(family|founder)[- ]owned since",
    "since (19|20)\\d\\d\\b",
    "\\d{2,6}\\+? (employees|people|locations|stores|reps)",
    "i noticed you (guys |folks |all )?(provide|offer|do|have|run|are doing)",
    "(some )?(cool|great|awesome|amazing|impressive|nice) (services|programs|work|stuff|company|things|content)",
    "you'?ve got going on",
    "the fact that you'?re [^.\\n]{0,60}(shows|says|speaks|proves)",
    "shows real (clarity|commitment|vision|focus|dedication|leadership)",
    "is a testament to", "speaks volumes",
    "(mix|blend|combination) of [a-z-]+, [a-z-]+,? and [a-z-]+",
    "stands out (with|for|as|because)",
    "(write|reach out) to (each|every) [^.\\n]{0,25}personally",
    "tailored (pitch|message|outreach|approach)",
    "\\b(managers|directors|vps|executives)\\b[^.\\n]{0,80}\\b(managers|directors|vps|executives)\\b",
  ]);
const ENRICHMENT_CASED = [
  new RegExp("\\b[A-Z][A-Za-z&' ]{2,30}, (Inc|LLC|L\\.L\\.C\\.|Corp|Ltd)\\b"),
];

const SKETCHY_TLDS = new Set(["info", "club", "online", "shop", "site", "xyz", "top", "icu"]);
const OUTBOUND_TOKENS = /(reply|convert|outreach|leadgen|leads?flow|pipeline|prospect|outbound|booked|meetings|revops|gtm|coldemail|dialer)/;

const CUE_CATEGORIES = {
  "named-referral": [
    /referred by [A-Z]/i,
    /[A-Z][a-z]+(?: [A-Z][a-z]+)? (?:at|from|of) [A-Za-z][A-Za-z]+ mentioned you/i,
  ],
  "shared-history": [
    /we met at/i, /(as|per) (we|our) discussed/i,
    /(great|good) (seeing|talking to|meeting) you/i,
  ],
  "operational-detail": [
    /\b(invoice|webhook|endpoint|stripe|bug|(?<!high-)ticket|deploy|PO number)\b/i,
  ],
  "personal-register": [
    /your (talk|post|article|podcast|episode)/i, /\bcongrats\b/i, /loved (your|the)/i,
  ],
};

function matched(res, text) {
  return res.filter((r) => r.test(text)).map((r) => r.source);
}

export function score({ email, sender = "", recipient = "" }) {
  const body = email || "";
  const text = body;
  const from = (sender || "").toLowerCase();
  const to = (recipient || "").toLowerCase();
  const fired = [];
  let commercial = 0;

  const fire = (group, matches, extraNote) => {
    fired.push({
      id: group.id, name: group.name, weight: group.weight,
      commercial: group.commercial, evidence: group.evidence, fix: group.fix,
      matches, note: extraNote,
    });
    if (group.commercial) commercial += 1;
  };

  for (const g of SIGNAL_GROUPS) {
    const m = matched(g.patterns, text);
    if (m.length) fire(g, m);
  }
  {
    const m = [...matched(ENRICHMENT.patterns, text),
               ...matched(ENRICHMENT_CASED, text)];
    if (m.length) fire(ENRICHMENT, m);
  }

  // --- bonus: self-quoted thread (non-commercial) ---
  const senderLocal = from.split("@")[0];
  let selfQuoted = false;
  if (/^\s*>/m.test(body) && senderLocal && body.toLowerCase().includes(senderLocal)) selfQuoted = true;
  else {
    const attrib = body.match(/\bOn [^\n]{5,160}?\bwrote:/);
    if (attrib && senderLocal && attrib[0].toLowerCase().includes(senderLocal)) selfQuoted = true;
  }
  if (selfQuoted) {
    fired.push({ id: "self_quoted", name: "Self-quoted thread", weight: 0.20, commercial: false,
      evidence: "A quoted thread with only your side in it fakes a conversation that never happened.",
      fix: "Don't quote your own unanswered email underneath. Start clean.", matches: [] });
  }

  // --- bonus: merge-field artifacts (commercial) ---
  const artifacts = [];
  const digitNoun = body.match(/\b[A-Z][a-z]{3,}\d\b/g);
  if (digitNoun) artifacts.push(`proper noun with stray digit: ${digitNoun.join(", ")}`);
  const gm = body.match(/\b(?:[Dd]ear|[Hh]i|[Hh]ey|[Hh]ello)\s+([A-Za-z][a-z]+)/);
  if (gm && to) {
    const greeted = gm[1].toLowerCase();
    if (!["there", "friend"].includes(greeted) && !to.includes(greeted)) {
      artifacts.push(`greeting '${gm[1]}' doesn't match recipient '${to}'`);
    }
  }
  if (artifacts.length) {
    commercial += 1;
    fired.push({ id: "merge_artifact", name: "Merge-field artifact", weight: 0.25, commercial: true,
      evidence: "A broken personalization token is hard proof of a template. Nobody was there to notice.",
      fix: "Your merge fields are broken. Fix the data or stop merging.", matches: artifacts });
  }

  // --- bonus: brand/domain mismatch (commercial) ---
  const claimed = [];
  const bm = body.match(/\bI'?m [A-Z][a-z]+,? (?:from|at|with) ([A-Z][A-Za-z0-9&-]{2,30})/);
  if (bm) claimed.push(bm[1]);
  const bm2 = body.match(/\bI (?:run|founded|lead|started) ([A-Z][A-Za-z0-9&-]{2,30})/);
  if (bm2) claimed.push(bm2[1]);
  const sigLines = body.trim().split("\n").map((l) => l.trim()).filter(Boolean).slice(-5);
  for (const line of sigLines) {
    if (/^[A-Z][A-Za-z&'.]+( [A-Z][A-Za-z&'.]+){0,3}$/.test(line) &&
        /\b(Capital|Partners?|Group|Funds?|Ventures?|Advisors?|Consulting|Solutions|Agency|Media|Labs|Holdings|LLC|Inc)\b/.test(line)) {
      claimed.push(line);
    }
    const dm = line.match(/^(?:www\.)?([A-Za-z0-9-]{3,30})\.(?:com|io|co|ai|net|org)$/);
    if (dm) claimed.push(dm[1]);
  }
  const senderDomain = from.split("@").pop() || "";
  const domainFlat = senderDomain.split(".").slice(0, -1).join("").replace(/[^a-z0-9]/g, "");
  for (const c of claimed) {
    const brand = c.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (brand && domainFlat && !domainFlat.includes(brand) && !brand.includes(domainFlat)) {
      commercial += 1;
      fired.push({ id: "brand_mismatch", name: "Brand/domain mismatch", weight: 0.20, commercial: true,
        evidence: `Claims "${c}", sends from "${senderDomain}".`,
        fix: "Real employees send from the domain of the company they name.", matches: [c] });
      break;
    }
  }

  // --- bonus: burner TLD (commercial) ---
  const tld = from.includes(".") ? from.split(".").pop() : "";
  if (SKETCHY_TLDS.has(tld)) {
    commercial += 1;
    fired.push({ id: "burner_tld", name: "Burner domain", weight: 0.10, commercial: true,
      evidence: `Disposable .${tld} domains are bought by the hundred, and filters know it.`,
      fix: "Send from your real company domain. If deliverability pushed you onto a throwaway, fix the sending reputation instead.",
      matches: [senderDomain] });
  }

  // --- bonus: scheduling link (commercial) ---
  if (/(calendly\.com|\bcal\.com\/|savvycal\.com|meetings\.hubspot\.com)/i.test(body)) {
    commercial += 1;
    fired.push({ id: "calendar_drop", name: "Scheduling link in first touch", weight: 0.15, commercial: true,
      evidence: "A calendar drop before any relationship exists. The meeting is the product.",
      fix: "Drop the calendar link from a first touch. Earn it in the reply.", matches: [] });
  }

  // --- bonus: lookalike-prefix sending domain (commercial) ---
  const senderSld = senderDomain.split(".").slice(0, -1).join(".").split(".").pop() || "";
  if (senderSld) {
    const bodyDomains = [...body.toLowerCase().matchAll(/(?:https?:\/\/|www\.)([a-z0-9-]+(?:\.[a-z0-9-]+)*)/g)]
      .map((m) => m[1].replace(/^www\./, ""));
    const bodySlds = new Set(bodyDomains.map((d) => d.split(".").slice(0, -1).join(".").split(".").pop()).filter(Boolean));
    for (const b of bodySlds) {
      if (b !== senderSld && senderSld.endsWith(b) &&
          ["my", "get", "try", "use", "go", "join", "hello", "team", "hq", "mail", "the"]
            .includes(senderSld.slice(0, senderSld.length - b.length))) {
        commercial += 1;
        fired.push({ id: "lookalike_domain", name: "Lookalike sending domain", weight: 0.20, commercial: true,
          evidence: `Sends from "${senderDomain}" but links the real domain "${b}". The shadow domain exists to protect the real one.`,
          fix: "Send from your real domain and stand behind the mail.", matches: [b] });
        break;
      }
    }
  }

  // --- bonus: outbound-branded sending domain (commercial) ---
  if (senderSld && OUTBOUND_TOKENS.test(senderSld)) {
    commercial += 1;
    fired.push({ id: "outbound_domain", name: "Outbound-branded sending domain", weight: 0.20, commercial: true,
      evidence: `"${senderDomain}" is named in cold-email jargon. Real companies aren't named after the act of emailing you.`,
      fix: "Use a subdomain of your real brand, not a domain named after outreach itself.", matches: [senderDomain] });
  }

  // 1) noisy-OR
  let combined = 1.0;
  for (const f of fired) combined *= 1.0 - f.weight;
  combined = 1.0 - combined;

  // 2) commercial-intent gate
  const gate = commercial >= 2 ? 1.0 : commercial === 1 ? 0.8 : 0.35;

  // 3) graduated human cues
  const cues = Object.entries(CUE_CATEGORIES)
    .filter(([, pats]) => pats.some((p) => p.test(text)))
    .map(([cat]) => cat);
  const penalty = cues.length ? Math.min(0.55, 0.30 + (cues.length - 1) * 0.15) : 0;

  const raw = Math.max(0, Math.min(combined * gate - penalty, 1));
  const s = Math.round(raw * 100) / 100;
  const verdict = s >= 0.55 ? "TRISH DETECTED" : s >= 0.30 ? "SMELLS LIKE TRISH" : "PASSES THE TRISH TEST";

  return {
    score: s, verdict,
    signals: fired,
    commercial_signals: commercial, gate,
    human_cues: cues, cue_penalty: penalty,
    notes: "Structure is scored, not intent. A low score means nothing looks templated; it doesn't mean the sender is honest.",
  };
}
