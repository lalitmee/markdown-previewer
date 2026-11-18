import { describe, expect, it } from 'vitest';
import { resolveDocumentLink } from '../documentLinks';

describe('resolveDocumentLink', () => {
  it.each([
    ['../README.md', 'README.md', ''],
    ['./other.md#setup', 'docs/other.md', 'setup'],
    ['my%20notes.md?view=1#some%20heading', 'docs/my notes.md', 'some heading'],
    ['/README.md', 'README.md', ''],
    ['#intro', 'docs/guide.md', 'intro'],
  ])('resolves %s', (href, path, hash) => {
    expect(resolveDocumentLink(href, 'docs/guide.md')).toEqual({ path, hash });
  });
  it.each(['../../secret.md', '%2e%2e/%2e%2e/secret.md', '%invalid'])(
    'rejects unsafe or malformed paths: %s',
    (href) => {
      expect(resolveDocumentLink(href, 'docs/guide.md').error).toBeTruthy();
    },
  );
  it.each([
    'https://example.com/a.md',
    '//example.com/a.md',
    'mailto:user@example.com',
  ])('leaves external links alone: %s', (href) => {
    expect(resolveDocumentLink(href, 'guide.md')).toBeNull();
  });
});
