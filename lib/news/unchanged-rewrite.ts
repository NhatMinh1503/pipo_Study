/** Line endings and surrounding whitespace differ by browser and OS, never by the learner. */
function normalize(text: string): string {
  return text.replace(/\r\n?/g, "\n").trim();
}

/**
 * Whether a submitted passage is exactly the cached news rewrite. Only an unchanged rewrite
 * counts as a news lesson; any edit makes it the learner's own (manual) lesson, which is
 * subject to the daily XP cap (xp-levels spec §3.6).
 */
export function isUnchangedRewrite(submitted: string, cachedPassage: string): boolean {
  const text = normalize(submitted);
  return text.length > 0 && text === normalize(cachedPassage);
}
