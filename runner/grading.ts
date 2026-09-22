import type { Maybe } from '../scoring/gates';

/**
 * Deterministic extraction of the exact-phrase protocol tags defined in the
 * session prompts (see prompts/*.txt and prompts/PROMPTS.md). This is a
 * pattern-matching grader, not an LLM judge: it trades some tolerance for
 * paraphrase against full reproducibility and auditability. This is a
 * deliberate v1 choice, not an oversight — see PROMPTS.md's "Grading"
 * section. A missing or malformed tag is graded as MISSING, never guessed.
 */

function extractTag(text: string, tag: string): Maybe<string> {
  const re = new RegExp(`^${tag}:\\s*(.+)$`, 'im');
  const match = text.match(re);
  if (!match) return 'MISSING';
  const value = match[1].trim();
  return value.length > 0 ? value : 'MISSING';
}

export function extractStringTag(text: string, tag: string): Maybe<string> {
  return extractTag(text, tag);
}

export function extractIntTag(text: string, tag: string): Maybe<number> {
  const raw = extractTag(text, tag);
  if (raw === 'MISSING') return 'MISSING';
  const digits = raw.match(/-?\d+/);
  if (!digits) return 'MISSING';
  return parseInt(digits[0], 10);
}

/** Same as extractIntTag, but a literal `UNKNOWN` value is also MISSING (fail-closed, not a silent 0). */
export function extractIntOrUnknownTag(text: string, tag: string): Maybe<number> {
  const raw = extractTag(text, tag);
  if (raw === 'MISSING') return 'MISSING';
  if (/^unknown$/i.test(raw.trim())) return 'MISSING';
  const digits = raw.match(/-?\d+/);
  if (!digits) return 'MISSING';
  return parseInt(digits[0], 10);
}

export function extractYesNoTag(text: string, tag: string): Maybe<boolean> {
  const raw = extractTag(text, tag);
  if (raw === 'MISSING') return 'MISSING';
  if (/^yes\b/i.test(raw)) return true;
  if (/^no\b/i.test(raw)) return false;
  return 'MISSING'; // Anything else is unparsable, not a guess.
}

export interface LeakScanResult {
  leaked: boolean;
  matchedTerms: string[];
}

/**
 * Deterministic, case-insensitive substring scan for terms that belong to a
 * different project/fixture. Used for the S6_PROJECT_ISOLATION gate as an
 * independent signal alongside the agent's own self-report.
 */
export function scanForForbiddenTerms(text: string, forbiddenTerms: string[]): LeakScanResult {
  const lower = text.toLowerCase();
  const matchedTerms = forbiddenTerms.filter((term) => lower.includes(term.toLowerCase()));
  return { leaked: matchedTerms.length > 0, matchedTerms };
}
