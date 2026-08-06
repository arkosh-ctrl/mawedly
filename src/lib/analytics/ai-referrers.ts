/**
 * Classify an inbound referrer into an answer-engine source.
 *
 * WHY THIS EXISTS AT ALL: the point of GEO work is being cited inside ChatGPT,
 * Perplexity, Google AI Overviews and Gemini answers. Without this split, that
 * traffic lands in a generic "referral" bucket and there is no way to tell
 * whether any of the work moved anything. Measurement has to exist BEFORE the
 * campaign, not after — a baseline you did not record cannot be reconstructed.
 *
 * A pure function on purpose: no globals, no window, no analytics import. It is
 * unit-tested against the real hostnames these products send, and the reporting
 * layer is free to change without touching the classification rules.
 */

/** Sources we deliberately track separately. */
export const AI_SOURCES = [
  "chatgpt",
  "perplexity",
  "claude",
  "gemini",
  "copilot",
] as const;

export type AiSource = (typeof AI_SOURCES)[number];

/**
 * Hostname suffixes per source.
 *
 * Matched as SUFFIXES against the parsed hostname, never as substrings of the
 * whole URL. A naive `url.includes("claude.ai")` would classify
 * `https://evil.example.com/?ref=claude.ai` as a Claude referral, and would
 * also match a path segment. Suffix matching on a parsed hostname cannot.
 */
const HOSTS: Record<AiSource, readonly string[]> = {
  chatgpt: ["chat.openai.com", "chatgpt.com"],
  perplexity: ["perplexity.ai"],
  claude: ["claude.ai"],
  // Gemini answers and AI Overviews both surface under these.
  gemini: ["gemini.google.com", "bard.google.com"],
  copilot: ["copilot.microsoft.com"],
};

function hostMatches(hostname: string, suffix: string): boolean {
  // Exact host, or a subdomain of it. "notchatgpt.com" must not match
  // "chatgpt.com", which is why the dot is required for the subdomain case.
  return hostname === suffix || hostname.endsWith(`.${suffix}`);
}

/**
 * Returns the answer engine a visit came from, or null for everything else.
 *
 * Accepts the raw Referer header value, which may be absent, empty, or not a
 * URL at all — all of which are normal and none of which should throw.
 */
export function classifyAiReferrer(referrer: string | null | undefined): AiSource | null {
  if (!referrer) return null;

  let hostname: string;
  try {
    hostname = new URL(referrer).hostname.toLowerCase();
  } catch {
    // Malformed Referer headers are common enough not to be worth logging.
    return null;
  }

  for (const source of AI_SOURCES) {
    if (HOSTS[source].some((suffix) => hostMatches(hostname, suffix))) {
      return source;
    }
  }
  return null;
}

/** Stable event name for the analytics sink, e.g. "ai_referral_perplexity". */
export function aiReferralEvent(source: AiSource): string {
  return `ai_referral_${source}`;
}
