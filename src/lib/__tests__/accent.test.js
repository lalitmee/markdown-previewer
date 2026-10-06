import { describe, expect, it } from 'vitest';
import { ACCENT_PRESETS, contrastForeground } from '../accent';

describe('ACCENT_PRESETS', () => {
  it('exports six preset hex colors including the default blue', () => {
    expect(ACCENT_PRESETS).toHaveLength(6);
    expect(ACCENT_PRESETS).toContain('#1a73e8');
    for (const c of ACCENT_PRESETS) {
      expect(c).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});

describe('contrastForeground', () => {
  it('returns dark text for light colors', () => {
    expect(contrastForeground('#ffffff')).toBe('#000000');
    expect(contrastForeground('#f9ab00')).toBe('#000000');
  });

  it('returns light text for dark colors', () => {
    expect(contrastForeground('#000000')).toBe('#ffffff');
    expect(contrastForeground('#1a73e8')).toBe('#ffffff');
    expect(contrastForeground('#188038')).toBe('#ffffff');
  });

  it('falls back to white for invalid input', () => {
    expect(contrastForeground('')).toBe('#ffffff');
    expect(contrastForeground('not-a-color')).toBe('#ffffff');
    expect(contrastForeground(undefined)).toBe('#ffffff');
  });
});