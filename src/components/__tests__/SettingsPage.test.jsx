import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import SettingsPage from '../SettingsPage';
import { ACCENT_PRESETS } from '../../lib/accent';

function render(props = {}) {
  return renderToStaticMarkup(createElement(SettingsPage, {
    rules: [],
    theme: 'light',
    accent: null,
    onThemeSelect: () => {},
    onAccentSelect: () => {},
    onAdd: () => {},
    onRemove: () => {},
    onReset: () => {},
    onBack: () => {},
    ...props,
  }));
}

function container(html) {
  const el = document.createElement('div');
  el.innerHTML = html;
  return el;
}

describe('SettingsPage', () => {
  it('renders a back button, input, and type toggle (Enter adds, no Add button)', () => {
    const c = container(render());
    expect(c.querySelector('[aria-label="Back"]')).not.toBeNull();
    expect(c.querySelector('input')).not.toBeNull();
    expect(c.querySelector('[aria-label="Name pattern"]')).not.toBeNull();
    expect(c.querySelector('[aria-label="Regex pattern"]')).not.toBeNull();
    expect(c.querySelector('[aria-label="Add exclusion"]')).toBeNull();
  });

  it('shows a no-exclusions message when the list is empty', () => {
    expect(container(render()).querySelector('.settings-empty')).not.toBeNull();
  });

  it('renders one chip per rule', () => {
    const c = container(render({
      rules: [
        { type: 'name', value: 'node_modules' },
        { type: 'regex', value: '^docs/private/' },
      ],
    }));
    expect(c.querySelectorAll('.settings-chip').length).toBe(2);
    expect(c.querySelector('.settings-chip').textContent).toContain('node_modules');
  });

  it('renders an appearance section with a theme toggle', () => {
    const c = container(render());
    expect(c.querySelector('.settings-section .settings-row')).not.toBeNull();
    expect(c.querySelector('[aria-label="Theme"]')).not.toBeNull();
  });

  it('renders system, light, and dark theme icons in one segmented toggle', () => {
    const c = container(render());
    const group = c.querySelector('[aria-label="Theme"]');
    expect(group).not.toBeNull();
    expect(group.querySelectorAll('button').length).toBe(3);
    expect(group.querySelector('[aria-label="System theme"]')).not.toBeNull();
    expect(group.querySelector('[aria-label="Light theme"]')).not.toBeNull();
    expect(group.querySelector('[aria-label="Dark theme"]')).not.toBeNull();
  });

  it('marks the selected theme with aria-pressed', () => {
    const c = container(render({ theme: 'system' }));
    expect(c.querySelector('[aria-label="System theme"]').getAttribute('aria-pressed')).toBe('true');
    expect(c.querySelector('[aria-label="Light theme"]').getAttribute('aria-pressed')).toBe('false');
    expect(c.querySelector('[aria-label="Dark theme"]').getAttribute('aria-pressed')).toBe('false');
  });

  it('keeps the reset button enabled even when the list is empty', () => {
    const c = container(render());
    const reset = c.querySelector('.settings-reset');
    expect(reset).not.toBeNull();
    expect(reset.getAttribute('disabled')).toBeNull();
    expect(c.textContent).toContain('Reset to defaults');
  });

  it('renders accent presets and a free color picker', () => {
    const c = container(render());
    expect(c.textContent).toContain('Accent color');
    const group = c.querySelector('[aria-label="Accent color presets"]');
    expect(group).not.toBeNull();
    const swatches = group.querySelectorAll('.accent-swatch');
    expect(swatches.length).toBe(ACCENT_PRESETS.length);
    for (const hex of ACCENT_PRESETS) {
      expect(group.querySelector(`[aria-label="Accent color ${hex}"]`)).not.toBeNull();
    }
    const picker = group.querySelector('input[type="color"]');
    expect(picker).not.toBeNull();
    expect(picker.getAttribute('aria-label')).toBe('Custom accent color');
  });

  it('marks the active accent preset with aria-pressed', () => {
    const c = container(render({ accent: '#188038' }));
    expect(c.querySelector('[aria-label="Accent color #188038"]').getAttribute('aria-pressed')).toBe('true');
    expect(c.querySelector('[aria-label="Accent color #1a73e8"]').getAttribute('aria-pressed')).toBe('false');
  });

  it('fires onAccentSelect when a preset is clicked', async () => {
    const onAccentSelect = vi.fn();
    const host = document.createElement('div');
    const root = createRoot(host);
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;

    await act(async () => {
      root.render(createElement(SettingsPage, {
        rules: [],
        theme: 'light',
        accent: null,
        onThemeSelect: () => {},
        onAccentSelect,
        onAdd: () => {},
        onRemove: () => {},
        onReset: () => {},
        onBack: () => {},
      }));
    });

    const swatch = host.querySelector('[aria-label="Accent color #d93025"]');
    await act(async () => swatch.click());
    expect(onAccentSelect).toHaveBeenCalledWith('#d93025');

    await act(async () => root.unmount());
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  });
});