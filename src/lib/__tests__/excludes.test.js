import { describe, expect, it } from 'vitest';
import {
  DEFAULT_EXCLUDES,
  isValidRegex,
  parseRules,
  shouldExclude,
  validateDraft,
} from '../excludes';

describe('shouldExclude', () => {
  it('keeps everything when there are no rules', () => {
    expect(shouldExclude('docs/guide.md', [])).toBe(false);
  });

  it('excludes a directory by bare name at any depth', () => {
    const rules = [{ type: 'name', value: 'node_modules' }];
    expect(shouldExclude('node_modules', rules)).toBe(true);
    expect(shouldExclude('packages/app/node_modules', rules)).toBe(true);
  });

  it('excludes a file whose path contains a bare-name segment', () => {
    const rules = [{ type: 'name', value: 'node_modules' }];
    expect(shouldExclude('node_modules/pkg/README.md', rules)).toBe(true);
  });

  it('excludes a file by its own bare name at any depth', () => {
    const rules = [{ type: 'name', value: 'private.md' }];
    expect(shouldExclude('private.md', rules)).toBe(true);
    expect(shouldExclude('docs/internal/private.md', rules)).toBe(true);
  });

  it('keeps files that match no rule', () => {
    const rules = [
      { type: 'name', value: 'node_modules' },
      { type: 'name', value: '.git' },
    ];
    expect(shouldExclude('docs/guide.md', rules)).toBe(false);
    expect(shouldExclude('.hidden/guide.md', rules)).toBe(false);
  });

  it('matches a regex against the full relative path', () => {
    const rules = [{ type: 'regex', value: '^docs/private/' }];
    expect(shouldExclude('docs/private/notes.md', rules)).toBe(true);
    expect(shouldExclude('docs/public/notes.md', rules)).toBe(false);
  });

  it('supports filename regex patterns', () => {
    const rules = [{ type: 'regex', value: '\\.draft\\.md$' }];
    expect(shouldExclude('docs/notes.draft.md', rules)).toBe(true);
    expect(shouldExclude('docs/notes.md', rules)).toBe(false);
  });

  it('ignores invalid regex rules instead of throwing', () => {
    const rules = [{ type: 'regex', value: '[' }];
    expect(shouldExclude('docs/notes.md', rules)).toBe(false);
  });
});

describe('isValidRegex', () => {
  it('accepts valid patterns and rejects broken ones', () => {
    expect(isValidRegex('^[a-z]+/')).toBe(true);
    expect(isValidRegex('[')).toBe(false);
  });
});

describe('validateDraft', () => {
  it('rejects an empty draft', () => {
    expect(validateDraft('   ', 'name', [])).toBeTruthy();
  });

  it('rejects path separators in bare names', () => {
    expect(validateDraft('docs/private', 'name', [])).toBeTruthy();
  });

  it('rejects invalid regex patterns', () => {
    expect(validateDraft('[', 'regex', [])).toBeTruthy();
  });

  it('rejects a rule that already exists', () => {
    const rules = [{ type: 'name', value: 'node_modules' }];
    expect(validateDraft('node_modules', 'name', rules)).toBeTruthy();
    expect(validateDraft('node_modules', 'regex', rules)).toBeNull();
  });

  it('accepts a valid new rule', () => {
    expect(validateDraft('node_modules', 'name', [])).toBeNull();
    expect(validateDraft('^docs/private/', 'regex', [])).toBeNull();
  });
});

describe('parseRules', () => {
  it('parses stored JSON into rules', () => {
    const raw = JSON.stringify([{ type: 'name', value: 'dist' }]);
    expect(parseRules(raw)).toEqual([{ type: 'name', value: 'dist' }]);
  });

  it('returns an empty array for corrupt stored values', () => {
    expect(parseRules('not json')).toEqual([]);
    expect(parseRules('')).toEqual([]);
  });

  it('drops malformed entries', () => {
    const raw = JSON.stringify([
      { type: 'name', value: 'dist' },
      { type: 'bogus', value: 'x' },
      { type: 'regex', value: 42 },
      null,
    ]);
    expect(parseRules(raw)).toEqual([{ type: 'name', value: 'dist' }]);
  });
});

describe('DEFAULT_EXCLUDES', () => {
  it('seeds node_modules and .git as bare names', () => {
    expect(DEFAULT_EXCLUDES).toEqual([
      { type: 'name', value: 'node_modules' },
      { type: 'name', value: '.git' },
    ]);
  });
});
