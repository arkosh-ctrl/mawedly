// Referrer classification is security-adjacent: a substring match would let any
// site claim to be Perplexity by putting the string in a query parameter, and
// would quietly corrupt the only numbers that tell us whether the GEO work
// achieved anything.
//
// Run with:  npm run test:seo

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  AI_SOURCES,
  aiReferralEvent,
  classifyAiReferrer,
} from "../src/lib/analytics/ai-referrers.ts";

test("classifies each answer engine from its real referrer", () => {
  const cases: [string, string][] = [
    ["https://chat.openai.com/", "chatgpt"],
    ["https://chatgpt.com/c/abc-123", "chatgpt"],
    ["https://www.perplexity.ai/search?q=mawedly", "perplexity"],
    ["https://claude.ai/chat/xyz", "claude"],
    ["https://gemini.google.com/app", "gemini"],
    ["https://bard.google.com/", "gemini"],
    ["https://copilot.microsoft.com/", "copilot"],
  ];
  for (const [referrer, expected] of cases) {
    assert.equal(classifyAiReferrer(referrer), expected, referrer);
  }
});

test("subdomains count, lookalike domains do not", () => {
  assert.equal(classifyAiReferrer("https://www.perplexity.ai/"), "perplexity");
  // The dot is what stops "notchatgpt.com" matching "chatgpt.com".
  assert.equal(classifyAiReferrer("https://notchatgpt.com/"), null);
  assert.equal(classifyAiReferrer("https://claude.ai.evil.example/"), null);
});

test("a spoofed referrer cannot claim to be an answer engine", () => {
  // The whole reason this matches a PARSED HOSTNAME and not the raw string.
  assert.equal(classifyAiReferrer("https://evil.example.com/?ref=claude.ai"), null);
  assert.equal(classifyAiReferrer("https://evil.example.com/chatgpt.com"), null);
  assert.equal(
    classifyAiReferrer("https://evil.example.com/#https://perplexity.ai"),
    null,
  );
});

test("ordinary and missing referrers classify as null", () => {
  for (const referrer of [
    null,
    undefined,
    "",
    "not a url",
    "https://www.google.com/",
    "https://www.mawedly.com/ar/pricing",
    "https://linkedin.com/feed",
  ]) {
    assert.equal(classifyAiReferrer(referrer), null, String(referrer));
  }
});

test("event names are stable and namespaced", () => {
  for (const source of AI_SOURCES) {
    assert.equal(aiReferralEvent(source), `ai_referral_${source}`);
    // Renaming these silently orphans historical data in the analytics UI.
    assert.match(aiReferralEvent(source), /^ai_referral_[a-z]+$/);
  }
});
