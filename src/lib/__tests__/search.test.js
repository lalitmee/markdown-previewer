import { describe, it, expect } from 'vitest';
import {
  escapeHtml,
  findSnippet,
  highlightSnippet,
  isMarkdownName,
  isImageName,
  normPath,
  dirOf,
  resolveRel,
} from '../search';

describe('isMarkdownName / isImageName', () => {
  it('detects markdown extensions case-insensitively', () => {
    expect(isMarkdownName('PLAN.md')).toBe(true);
    expect(isMarkdownName('a.markdown')).toBe(true);
    expect(isMarkdownName('cursor.plan')).toBe(false);
    expect(isMarkdownName('cursor.plan.md')).toBe(true);
  });
  it('detects image extensions', () => {
    expect(isImageName('x.PNG')).toBe(true);
    expect(isImageName('x.svg')).toBe(true);
    expect(isImageName('x.txt')).toBe(false);
  });
});

describe('findSnippet', () => {
  it('returns the matching line trimmed', () => {
    expect(findSnippet('a\nsmoke test line\nb', 'smoke')).toBe('smoke test line');
  });
  it('returns empty for no match or blank query', () => {
    expect(findSnippet('abc', 'zzz')).toBe('');
    expect(findSnippet('abc', '  ')).toBe('');
  });
});

describe('highlightSnippet', () => {
  it('escapes then wraps matches', () => {
    expect(highlightSnippet('a <b> smoke', 'smoke')).toBe('a &lt;b&gt; <mark>smoke</mark>');
  });
  it('treats regex metacharacters literally', () => {
    expect(highlightSnippet('a.b', '.')).toBe('a<mark>.</mark>b');
  });
});

describe('path helpers', () => {
  it('normalizes leading slash', () => {
    expect(normPath('/a/b')).toBe('a/b');
  });
  it('extracts dirname', () => {
    expect(dirOf('a/b/c.md')).toBe('a/b');
    expect(dirOf('c.md')).toBe('');
  });
  it('resolves relative paths and rejects external urls', () => {
    expect(resolveRel('notes/sub', '../img/a.png')).toBe('notes/img/a.png');
    expect(resolveRel('', 'https://x.com/a.png')).toBeNull();
    expect(resolveRel('', 'data:image/png;base64,1')).toBeNull();
  });
});