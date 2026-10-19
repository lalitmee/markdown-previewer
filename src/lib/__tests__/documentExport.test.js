import { describe, expect, it, vi } from 'vitest';
import { buildStandaloneHtml } from '../documentExport';

function directory(files = {}) {
  return {
    getDirectoryHandle: vi.fn(async () => {
      throw new Error('No subdirectories');
    }),
    getFileHandle: vi.fn(async (name) => {
      if (!files[name]) throw new Error(`Missing file: ${name}`);
      return files[name];
    }),
  };
}

function imageFileHandle() {
  return {
    getFile: vi.fn(
      async () => new Blob(['image bytes'], { type: 'image/png' }),
    ),
  };
}

describe('buildStandaloneHtml', () => {
  it('uses the first H1 as page title and embeds document styles', async () => {
    const html = await buildStandaloneHtml({
      text: '# Main title\n\n## Section',
      title: 'filename.md',
    });

    expect(html).toContain('<title>Main title</title>');
    expect(html).toContain('<h1 id="main-title">Main title</h1>');
    expect(html).toContain('<style>');
    expect(html).toContain('.md-body');
  });

  it('falls back from source filename to Untitled document', async () => {
    const withFilename = await buildStandaloneHtml({
      text: 'Plain text',
      title: 'filename.md',
    });
    const untitled = await buildStandaloneHtml({
      text: 'Plain text',
      title: '',
    });

    expect(withFilename).toContain('<title>filename.md</title>');
    expect(untitled).toContain('<title>Untitled document</title>');
  });

  it('preserves markdown content and static Mermaid SVG without app controls', async () => {
    const html = await buildStandaloneHtml({
      text: [
        '# Guide',
        '',
        '[Jump](#details)',
        '',
        '| A | B |',
        '| --- | --- |',
        '| x | y |',
        '',
        '```js',
        'const answer = 42;',
        '```',
        '',
        '## Details',
        '',
        '```mermaid',
        'graph LR\nA --> B',
        '```',
      ].join('\n'),
    });

    expect(html).toContain('href="#details"');
    expect(html).toContain('<table>');
    expect(html).toContain('answer');
    expect(html).toContain('42');
    expect(html).toContain('<svg');
    expect(html).not.toMatch(/class="(?:mp-expand|mp-filter|table-dialog)/);
    expect(html).not.toContain('data-original-src=');
  });

  it('inlines local images and preserves remote image URLs', async () => {
    const imageHandle = imageFileHandle();
    const folderHandle = directory({ 'local.png': imageHandle });
    const html = await buildStandaloneHtml({
      text: '![Local](local.png)\n\n![Remote](https://example.com/image.png)',
      folderHandle,
      activePath: 'README.md',
    });

    expect(html).toMatch(/src="data:image\/png;base64,/);
    expect(html).toContain('src="https://example.com/image.png"');
    expect(imageHandle.getFile).toHaveBeenCalledOnce();
  });

  it('escapes the title in the HTML document metadata', async () => {
    const html = await buildStandaloneHtml({
      text: 'Plain text',
      title: 'A & B <guide>.md',
    });

    expect(html).toContain('<title>A &amp; B &lt;guide&gt;.md</title>');
  });
});
