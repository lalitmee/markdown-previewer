import { describe, expect, it, vi } from 'vitest';
import mermaid from 'mermaid';
import pdfMake from 'pdfmake/build/pdfmake.js';
import * as documentExport from '../documentExport';
import { buildStandaloneHtml } from '../documentExport';

vi.mock('pdfmake/build/pdfmake.js', () => ({
  default: {
    addVirtualFileSystem: vi.fn(),
    createPdf: vi.fn(() => ({ download: vi.fn() })),
  },
}));

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

describe('downloadPdf', () => {
  it('adds the title and page numbering and omits TOC for one heading', async () => {
    await documentExport.downloadPdf({ html: '<p>Body</p>', title: 'Guide' });
    expect(
      pdfMake.createPdf.mock.calls.at(-1)[0].content.some((node) => node.toc),
    ).toBe(false);

    await documentExport.downloadPdf({
      html: '<h1>Guide</h1><p>Body</p>',
      title: 'Guide',
    });

    const definition = pdfMake.createPdf.mock.calls.at(-1)[0];
    const pdf = pdfMake.createPdf.mock.results.at(-1).value;
    expect(definition.content[0]).toMatchObject({
      text: 'Guide',
      style: 'title',
    });
    expect(definition.content.some((node) => node.toc)).toBe(false);
    expect(definition.footer).toBeTypeOf('function');
    expect(pdf.download).toHaveBeenCalledWith('Guide.pdf');
  });

  it('adds a compact table of contents for multiple headings', async () => {
    await documentExport.downloadPdf({
      html: '<h1>Guide</h1><h2>Details</h2>',
      title: 'Guide',
    });

    const definition = pdfMake.createPdf.mock.calls.at(-1)[0];
    expect(definition.content.some((node) => node.toc)).toBe(true);
    expect(JSON.stringify(definition.content)).toContain('Details');
  });

  it('converts tables, code, links, images, and Mermaid SVG', async () => {
    await documentExport.downloadPdf({
      html: [
        '<h1>Guide</h1>',
        '<table><tr><th>A</th></tr><tr><td>Cell</td></tr></table>',
        '<pre><code>const answer = 42;</code></pre>',
        '<a href="https://example.com">Link</a>',
        '<img src="data:image/png;base64,aW1hZ2U=">',
        '<svg width="10" height="10" xmlns="http://www.w3.org/2000/svg"><path d="M0 0"/></svg>',
      ].join(''),
      title: 'Guide',
    });

    const definition = pdfMake.createPdf.mock.calls.at(-1)[0];
    const content = JSON.stringify(definition.content);
    expect(content).toContain('Cell');
    expect(content).toContain('const answer = 42;');
    expect(content).toContain('https://example.com');
    expect(content).toContain('data:image/png;base64');
    expect(content).toContain('<svg');
  });

  it('inlines folder images into the PDF conversion input', async () => {
    const folderHandle = directory({ 'local.png': imageFileHandle() });
    const html = await buildStandaloneHtml({
      text: '![Local](local.png)',
      folderHandle,
      activePath: 'README.md',
    });
    await documentExport.downloadPdf({ html, title: 'Guide' });

    expect(
      JSON.stringify(pdfMake.createPdf.mock.calls.at(-1)[0].content),
    ).toContain('data:image/png;base64,');
  });

  it('rasterizes Mermaid diagrams before converting them to PDF', async () => {
    const initialize = vi.spyOn(mermaid, 'initialize');
    vi.stubGlobal(
      'Image',
      class {
        naturalWidth = 260;
        naturalHeight = 70;
        decode = vi.fn(async () => {});
        set src(value) {
          this.source = value;
        }
      },
    );
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage: vi.fn(),
    });
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(
      'data:image/png;base64,cmFzdGVy',
    );
    const html = await buildStandaloneHtml({
      text: '```mermaid\ngraph LR\nA[Alpha] --> B[Beta]\n```',
      theme: 'dark',
      mermaidHtmlLabels: false,
    });
    await documentExport.downloadPdf({ html, title: 'Guide' });

    const content = JSON.stringify(pdfMake.createPdf.mock.calls.at(-1)[0]);
    expect(initialize).toHaveBeenCalledWith(
      expect.objectContaining({ htmlLabels: false }),
    );
    expect(content).toContain('data:image/png;base64,cmFzdGVy');
    expect(content).not.toContain('<svg');
    expect(content).not.toContain('foreignObject');
    initialize.mockRestore();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('degrades remote images to their alt text', async () => {
    await documentExport.downloadPdf({
      html: '<img src="https://example.com/blocked.png" alt="Remote image">',
      title: 'Guide',
    });

    const content = JSON.stringify(pdfMake.createPdf.mock.calls.at(-1)[0]);
    expect(content).toContain('Remote image');
    expect(content).not.toContain('https://example.com/blocked.png');
  });

  it('rejects when the PDF download fails', async () => {
    pdfMake.createPdf.mockReturnValueOnce({
      download: vi.fn().mockRejectedValue(new Error('PDF failed')),
    });

    await expect(
      documentExport.downloadPdf({ html: '<p>Body</p>', title: 'Guide' }),
    ).rejects.toThrow('PDF failed');
  });
});
