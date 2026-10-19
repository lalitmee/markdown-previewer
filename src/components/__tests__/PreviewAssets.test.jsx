import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import Preview from '../Preview';

vi.mock('../../lib/markdown', () => ({ renderMarkdown: async (html) => html }));
vi.mock('../../lib/fs-access', () => ({ inlineImages: async (html) => html }));

let host;
let root;
let createObjectURL;
let revokeObjectURL;
let anchorClick;
let downloadedFilename;
let anchorWasConnected;

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  createObjectURL = vi.fn(() => 'blob:download');
  revokeObjectURL = vi.fn();
  downloadedFilename = '';
  anchorWasConnected = false;
  anchorClick = vi
    .spyOn(HTMLAnchorElement.prototype, 'click')
    .mockImplementation(function () {
      downloadedFilename = this.download;
      anchorWasConnected = this.isConnected;
    });
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value: createObjectURL,
  });
  Object.defineProperty(URL, 'revokeObjectURL', {
    configurable: true,
    value: revokeObjectURL,
  });
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  anchorClick.mockRestore();
  delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  vi.unstubAllGlobals();
});

async function render(html, onNotice = vi.fn()) {
  await act(async () =>
    root.render(
      createElement(Preview, {
        entry: { path: 'guide.md', name: 'guide.md' },
        text: html,
        setText: vi.fn(),
        tableState: {},
        setTableState: vi.fn(),
        theme: 'light',
        folderHandle: null,
        mode: 'preview',
        editorFont: 'monospace',
        widthVar: '860px',
        onNotice,
      }),
    ),
  );
  return onNotice;
}

it('adds an accessible download control for each image and diagram', async () => {
  await render(
    '<img src="data:image/png;base64,aGVsbG8=" data-original-src="images/cover.png">' +
      '<div class="mdiagram"><svg><title>One</title></svg></div>' +
      '<div class="mdiagram"><svg><title>Two</title></svg></div>',
  );

  expect(
    host.querySelector('[aria-label="Download image: cover.png"]'),
  ).not.toBeNull();
  expect(
    host.querySelector('[aria-label="Download diagram 1 as SVG"]'),
  ).not.toBeNull();
  expect(
    host.querySelector('[aria-label="Download diagram 2 as SVG"]'),
  ).not.toBeNull();
});

it('downloads the original image using its source filename', async () => {
  await render(
    '<img src="data:image/png;base64,aGVsbG8=" data-original-src="images/cover.png">',
  );

  await act(async () =>
    host.querySelector('[aria-label="Download image: cover.png"]').click(),
  );

  expect(createObjectURL).toHaveBeenCalledOnce();
  expect(anchorClick).toHaveBeenCalledOnce();
  expect(downloadedFilename).toBe('cover.png');
  expect(anchorWasConnected).toBe(true);
  expect(revokeObjectURL).toHaveBeenCalledWith('blob:download');
});

it('downloads a Mermaid diagram as an SVG with a numbered filename', async () => {
  await render('<div class="mdiagram"><svg><title>Diagram</title></svg></div>');

  await act(async () =>
    host.querySelector('[aria-label="Download diagram 1 as SVG"]').click(),
  );

  expect(createObjectURL).toHaveBeenCalledOnce();
  const blob = createObjectURL.mock.calls[0][0];
  expect(blob.type).toBe('image/svg+xml');
  const svg = await new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsText(blob);
  });
  expect(svg).toContain('<svg');
  expect(downloadedFilename).toBe('diagram-1.svg');
});

it('reports a remote image download failure without opening it', async () => {
  const onNotice = vi.fn();
  vi.stubGlobal(
    'fetch',
    vi.fn().mockRejectedValue(new TypeError('CORS blocked')),
  );
  await render(
    '<img src="https://example.test/cover.png" data-original-src="https://example.test/cover.png">',
    onNotice,
  );

  await act(async () =>
    host.querySelector('[aria-label="Download image: cover.png"]').click(),
  );

  expect(onNotice).toHaveBeenCalledWith(
    "Can't download this image from its source",
  );
  expect(anchorClick).not.toHaveBeenCalled();
});

it('does not open the diagram zoom when its download control is clicked', async () => {
  await render('<div class="mdiagram"><svg><title>Diagram</title></svg></div>');

  await act(async () =>
    host.querySelector('[aria-label="Download diagram 1 as SVG"]').click(),
  );

  expect(host.querySelector('.zoom-dialog')).toBeNull();
});
