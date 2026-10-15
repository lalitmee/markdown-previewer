import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import Preview from '../Preview';

vi.mock('../../lib/fs-access', () => ({ inlineImages: async (html) => html }));

let host;
let root;
let scrollIntoView;

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  scrollIntoView = vi.fn();
  HTMLElement.prototype.scrollIntoView = scrollIntoView;
  window.matchMedia = () => ({ matches: false });
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  delete HTMLElement.prototype.scrollIntoView;
  delete globalThis.IS_REACT_ACT_ENVIRONMENT;
});

it.each(['#section-ten', 'guide.md#section-ten'])(
  'scrolls within the preview for %s',
  async (href) => {
    const text = `# Guide\n\n[Jump](${href})\n\n## Section Ten`;
    await act(async () =>
      root.render(
        createElement(Preview, {
          entry: { path: 'guide.md', name: 'guide.md' },
          text,
          setText: vi.fn(),
          tableState: {},
          setTableState: vi.fn(),
          theme: 'light',
          folderHandle: null,
          mode: 'preview',
          editorFont: 'monospace',
          widthVar: '860px',
        }),
      ),
    );
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    await act(async () => host.querySelector('a').dispatchEvent(event));
    expect(event.defaultPrevented).toBe(true);
    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'start',
    });
    expect(host.querySelector('#section-ten')).not.toBeNull();
  },
);

it('keeps an unresolved same-file fragment in the preview', async () => {
  await act(async () =>
    root.render(
      createElement(Preview, {
        entry: { path: 'guide.md', name: 'guide.md' },
        text: '[Missing](guide.md#missing)\n\n## Existing',
        setText: vi.fn(),
        tableState: {},
        setTableState: vi.fn(),
        theme: 'light',
        folderHandle: null,
        mode: 'preview',
        editorFont: 'monospace',
        widthVar: '860px',
      }),
    ),
  );
  const event = new MouseEvent('click', { bubbles: true, cancelable: true });
  await act(async () => host.querySelector('a').dispatchEvent(event));
  expect(event.defaultPrevented).toBe(true);
  expect(scrollIntoView).not.toHaveBeenCalled();
});

it('shows a back-to-top control after scrolling and returns upward', async () => {
  const scrollTo = vi.fn();
  window.scrollTo = scrollTo;
  Object.defineProperty(window, 'scrollY', {
    configurable: true,
    value: 0,
  });
  await act(async () =>
    root.render(
      createElement(Preview, {
        entry: { path: 'guide.md', name: 'guide.md' },
        text: '# Guide\n\n## Section',
        setText: vi.fn(),
        tableState: {},
        setTableState: vi.fn(),
        theme: 'light',
        folderHandle: null,
        mode: 'preview',
        editorFont: 'monospace',
        widthVar: '860px',
      }),
    ),
  );
  expect(host.querySelector('[aria-label="Back to top"]')).toBeNull();
  Object.defineProperty(window, 'scrollY', {
    configurable: true,
    value: 500,
  });
  await act(async () => window.dispatchEvent(new Event('scroll')));
  const button = host.querySelector('[aria-label="Back to top"]');
  expect(button).not.toBeNull();
  expect(button.classList.contains('icon-btn')).toBe(true);
  expect(button.querySelector('.material-symbols-outlined').textContent).toBe(
    'arrow_upward',
  );
  await act(async () => button.click());
  expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
});
