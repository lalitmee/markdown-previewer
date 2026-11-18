import { describe, expect, it } from 'vitest';
import { createExcerptCache, excerpt } from '../excerpt';

describe('library excerpts', () => {
  it('strips frontmatter, fenced code, links, images, and HTML', () => {
    expect(
      excerpt(
        '---\ntitle: Hidden\n---\n# Hello\n```js\nhidden()\n```\n[guide](guide.md) ![diagram](image.png) <b>world</b>',
      ),
    ).toBe('Hello guide diagram world');
  });

  it('bounds work before parsing, including malformed Markdown', () => {
    for (const character of ['[', '<', '`']) {
      const prefix = character.repeat(8192);
      expect(excerpt(prefix + 'SECRET TAIL'.repeat(100000))).toBe(
        excerpt(prefix),
      );
    }
    expect(excerpt('x'.repeat(1000000))).toBe('x'.repeat(240));
  });

  it('does not expose an unterminated frontmatter or code fence at the cutoff', () => {
    expect(excerpt('---\n' + 'metadata\n'.repeat(2000))).toBe('');
    expect(excerpt('Introduction\n```js\n' + 'code\n'.repeat(3000))).toBe(
      'Introduction',
    );
  });

  it('escapes HTML and returns at most 240 text characters', () => {
    expect(excerpt('A & B')).toBe('A &amp; B');
    expect(excerpt('**' + 'x'.repeat(1000))).toBe('x'.repeat(240));
  });

  it('reuses cached excerpts and updates them when a file changes', () => {
    const getExcerpt = createExcerptCache();
    expect(getExcerpt('a.md', '# First')).toBe('First');
    expect(getExcerpt('a.md', '# First')).toBe('First');
    expect(getExcerpt('a.md', '# Changed')).toBe('Changed');
    expect(getExcerpt('b.md', '# Other')).toBe('Other');
    expect(getExcerpt('a.md', '# Changed')).toBe('Changed');
  });
});
