import { describe, expect, it, vi } from 'vitest';
import { inlineImages } from '../fs-access';
import { renderMarkdown } from '../markdown';

function directory(directories = {}, files = {}) {
  return {
    getDirectoryHandle: vi.fn(async (name) => {
      if (!directories[name]) throw new Error(`Missing directory: ${name}`);
      return directories[name];
    }),
    getFileHandle: vi.fn(async (name) => {
      if (!files[name]) throw new Error(`Missing file: ${name}`);
      return files[name];
    }),
  };
}

function imageFileHandle() {
  return {
    getFile: vi.fn(async () => new Blob(['image bytes'], { type: 'image/png' })),
  };
}

describe('inlineImages', () => {
  it('inlines relative images from nested directories in the selected folder', async () => {
    const imageHandle = imageFileHandle();
    const folderHandle = directory({
      docs: directory({
        screenshots: directory({}, { 'calendar.png': imageHandle }),
      }),
    });

    const markdown = [
      '<details>',
      '<summary>Screenshots</summary>',
      '',
      '| Light | Dark |',
      '| --- | --- |',
      '| ![Calendar](docs/screenshots/calendar.png) | — |',
      '',
      '</details>',
    ].join('\n');
    const rendered = await renderMarkdown(markdown);
    const html = await inlineImages(
      rendered,
      folderHandle,
      'README.md',
    );

    const preview = document.createElement('div');
    preview.innerHTML = html;
    expect(preview.querySelector('img').src).toMatch(/^data:image\/png;base64,/);
    expect(folderHandle.getDirectoryHandle).toHaveBeenCalledWith('docs');
    expect(imageHandle.getFile).toHaveBeenCalledOnce();
  });

  it('resolves image paths relative to a nested Markdown document', async () => {
    const imageHandle = imageFileHandle();
    const folderHandle = directory({
      docs: directory({
        screenshots: directory({}, { 'calendar.png': imageHandle }),
      }),
    });

    await inlineImages(
      '<img src="./screenshots/calendar.png">',
      folderHandle,
      'docs/README.md',
    );

    expect(folderHandle.getDirectoryHandle).toHaveBeenCalledWith('docs');
    expect(imageHandle.getFile).toHaveBeenCalledOnce();
  });

  it('leaves external image URLs untouched', async () => {
    const folderHandle = directory();
    const html = await inlineImages(
      '<img src="https://example.com/image.png">',
      folderHandle,
      'README.md',
    );

    expect(html).toContain('src="https://example.com/image.png"');
    expect(folderHandle.getDirectoryHandle).not.toHaveBeenCalled();
  });

  it('does not resolve paths outside the selected folder', async () => {
    const folderHandle = directory();
    const html = await inlineImages(
      '<img src="../../outside.png">',
      folderHandle,
      'README.md',
    );

    expect(html).toContain('src="../../outside.png"');
    expect(folderHandle.getDirectoryHandle).not.toHaveBeenCalled();
  });
});
