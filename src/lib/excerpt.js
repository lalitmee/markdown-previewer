import { escapeHtml } from './search';

// A card preview must never parse an entire document on the UI thread.
const EXCERPT_INPUT_LIMIT = 8192;
const EXCERPT_LENGTH = 240;

export function excerpt(text) {
  let prefix = text.slice(0, EXCERPT_INPUT_LIMIT);
  if (prefix.startsWith('---\n') || prefix.startsWith('---\r\n')) {
    const end = /\r?\n---(?:\r?\n|$)/.exec(prefix.slice(3));
    if (!end) return '';
    prefix = prefix.slice(3 + end.index + end[0].length);
  }
  // Splitting also hides a fence that runs beyond the bounded prefix.
  const prose = prefix
    .split('```')
    .filter((_, index) => index % 2 === 0)
    .join(' ');
  return escapeHtml(
    prose
      // Exclude opening delimiters too, so unmatched runs cannot cause
      // quadratic backtracking by retrying the same suffix at every opener.
      .replace(/!?\[([^\][]*)\]\([^()]*\)/g, '$1')
      .replace(/<[^<>]*>/g, '')
      .replace(/[#*`>_~|]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, EXCERPT_LENGTH),
  );
}

export function createExcerptCache() {
  const entries = new Map();
  return (path, text) => {
    const previous = entries.get(path);
    if (previous?.text === text) return previous.html;
    const html = excerpt(text);
    entries.set(path, { text, html });
    return html;
  };
}
