export const DEFAULT_EXCLUDES = [
  { type: 'name', value: 'node_modules' },
  { type: 'name', value: '.git' },
];

export function isValidRegex(value) {
  try { new RegExp(value); return true; } catch (_) { return false; }
}

/**
 * True when a relative path (from the selected folder root) matches a rule.
 * Bare names match any path segment; regexes match the full relative path.
 */
export function shouldExclude(relPath, rules) {
  if (!rules || !rules.length || !relPath) return false;
  const segments = relPath.split('/');
  for (const rule of rules) {
    if (rule.type === 'name') {
      if (segments.includes(rule.value)) return true;
    } else if (rule.type === 'regex') {
      try {
        if (new RegExp(rule.value).test(relPath)) return true;
      } catch (_) { /* invalid stored pattern matches nothing */ }
    }
  }
  return false;
}

/** Returns an error message, or null when the draft rule is addable. */
export function validateDraft(value, type, rules) {
  const v = String(value || '').trim();
  if (!v) return 'Enter a name or pattern.';
  if (type === 'name' && v.includes('/')) return 'Use Regex for patterns containing "/".';
  if (type === 'regex' && !isValidRegex(v)) return 'That is not a valid regular expression.';
  if (rules.some((r) => r.type === type && r.value === v)) return 'That rule already exists.';
  return null;
}

/** Parse stored JSON, keeping only well-formed rules. */
export function parseRules(raw) {
  let parsed;
  try { parsed = JSON.parse(raw); } catch (_) { return []; }
  if (!Array.isArray(parsed)) return [];
  return parsed.filter((r) =>
    r && (r.type === 'name' || r.type === 'regex') && typeof r.value === 'string' && r.value.trim()
  );
}
