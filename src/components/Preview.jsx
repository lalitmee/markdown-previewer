import { useEffect, useId, useMemo, useRef, useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { EditorView } from '@codemirror/view';
import { renderMarkdown } from '../lib/markdown';
import { inlineImages } from '../lib/fs-access';
import { applyTableState, decorateTables } from '../lib/tableColumns';
import TableModal from './TableModal';
import ZoomModal from './ZoomModal';

export default function Preview({
  entry,
  text,
  setText,
  tableState,
  setTableState,
  theme,
  folderHandle,
  mode,
  editorFont,
  widthVar,
  onProcessingChange,
  onNotice,
}) {
  const [html, setHtml] = useState('');
  const [zoomSvg, setZoomSvg] = useState(null);
  const [expandedTable, setExpandedTable] = useState(null);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const previewRef = useRef(null);
  const previewId = useId();
  const renderIdRef = useRef(0);

  const expandedHtml = useMemo(() => {
    if (expandedTable === null) return '';
    const source = document.createElement('div');
    source.innerHTML = html;
    return (
      source.querySelectorAll('table')[expandedTable.index]?.outerHTML || ''
    );
  }, [html, expandedTable]);

  const fontTheme = EditorView.theme({
    '.cm-content': { fontFamily: editorFont },
  });
  const extensions = [markdown(), fontTheme];

  useEffect(() => {
    let cancelled = false;
    const id = `${previewId}-${++renderIdRef.current}`;
    onProcessingChange?.({ id, message: 'Rendering preview' });
    (async () => {
      try {
        const rendered = await renderMarkdown(text, theme);
        const inlined = await inlineImages(
          rendered,
          folderHandle,
          entry ? entry.path : '',
        );
        if (!cancelled) setHtml(inlined);
      } finally {
        if (!cancelled) onProcessingChange?.(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [text, theme, entry, folderHandle, onProcessingChange, previewId]);

  // Structural pass: rebuild handles/colgroup/rail on the fresh DOM. Keyed on
  // html + mode only, so a column drag never rebuilds the handles it holds.
  useEffect(() => {
    if (!previewRef.current) return;
    previewRef.current
      .querySelectorAll('.preview-document .md-body')
      .forEach((body) => decorateTables(body, { interactive: false }));
  }, [html, mode]);

  // Apply pass: cheap, runs after the structural pass and on every state change.
  useEffect(() => {
    if (!previewRef.current) return;
    previewRef.current
      .querySelectorAll('.preview-document .md-body')
      .forEach((b) => applyTableState(b, tableState));
  }, [tableState, html, mode]);

  useEffect(() => {
    const root = previewRef.current;
    if (!root) return;
    let imageNumber = 0;
    let diagramNumber = 0;

    root.querySelectorAll('.preview-document .md-body img').forEach((img) => {
      imageNumber += 1;
      if (img.parentElement.classList.contains('md-image-download')) return;
      const source = img.dataset.originalSrc || img.getAttribute('src') || '';
      const filename = source.startsWith('data:')
        ? ''
        : source.split(/[?#]/, 1)[0].split('/').pop();
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'md-asset-download';
      button.dataset.assetDownload = 'image';
      button.dataset.source = source;
      button.dataset.filename = filename || `image-${imageNumber}`;
      button.setAttribute(
        'aria-label',
        `Download image: ${filename || `image-${imageNumber}`}`,
      );
      button.title = button.getAttribute('aria-label');
      button.innerHTML =
        '<span class="material-symbols-outlined" aria-hidden="true">download</span>';
      const wrapper = document.createElement('span');
      wrapper.className = 'md-image-download';
      img.before(wrapper);
      wrapper.append(img, button);
    });

    root
      .querySelectorAll('.preview-document .md-body .mdiagram')
      .forEach((diagram) => {
        diagramNumber += 1;
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'md-asset-download';
        button.dataset.assetDownload = 'diagram';
        button.setAttribute(
          'aria-label',
          `Download diagram ${diagramNumber} as SVG`,
        );
        button.title = button.getAttribute('aria-label');
        button.innerHTML =
          '<span class="material-symbols-outlined" aria-hidden="true">download</span>';
        diagram.append(button);
      });
  }, [html, mode]);

  useEffect(() => {
    const scroller =
      mode === 'edit'
        ? previewRef.current?.querySelector('.split-right')
        : window;
    if (!scroller) return;
    const update = () =>
      setShowBackToTop(
        (scroller === window ? window.scrollY : scroller.scrollTop) > 400,
      );
    update();
    scroller.addEventListener('scroll', update, { passive: true });
    return () => scroller.removeEventListener('scroll', update);
  }, [mode, entry]);

  function goToTop() {
    const scroller =
      mode === 'edit'
        ? previewRef.current?.querySelector('.split-right')
        : window;
    scroller?.scrollTo({
      top: 0,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'instant'
        : 'smooth',
    });
  }

  function onClick(e) {
    const download = e.target.closest('button[data-asset-download]');
    if (download) {
      e.preventDefault();
      e.stopPropagation();
      void downloadAsset(download);
      return;
    }
    const link = e.target.closest('a[href]');
    if (
      link &&
      e.button === 0 &&
      !e.metaKey &&
      !e.ctrlKey &&
      !e.shiftKey &&
      !e.altKey
    ) {
      const href = link.getAttribute('href');
      const currentPath = entry?.path || '';
      const currentUrl = new URL(
        currentPath || 'pasted.md',
        'https://preview.local/',
      );
      const targetUrl = new URL(href, currentUrl);
      if (
        targetUrl.origin === currentUrl.origin &&
        targetUrl.pathname === currentUrl.pathname &&
        targetUrl.hash
      ) {
        e.preventDefault();
        const id = decodeURIComponent(targetUrl.hash.slice(1));
        const body = link.closest('.md-body');
        const target = [...body.querySelectorAll('[id]')].find(
          (node) => node.id === id,
        );
        if (target) {
          target.scrollIntoView({
            behavior: window.matchMedia('(prefers-reduced-motion: reduce)')
              .matches
              ? 'instant'
              : 'smooth',
            block: 'start',
          });
          return;
        }
      }
    }
    const diagram = e.target.closest('.mdiagram');
    if (diagram) {
      const svgChild = diagram.querySelector('svg');
      if (svgChild) {
        const clone = svgChild.cloneNode(true);
        clone.removeAttribute('style');
        setZoomSvg(clone.outerHTML);
      }
      return;
    }
    const expand = e.target.closest('.mp-expand');
    if (expand) {
      setExpandedTable({ index: Number(expand.dataset.t), opener: expand });
    }
  }

  async function downloadAsset(button) {
    try {
      let blob;
      let filename;
      if (button.dataset.assetDownload === 'diagram') {
        const svg = button.parentElement.querySelector('svg').outerHTML;
        const diagrams = [...previewRef.current.querySelectorAll('.mdiagram')];
        const number = diagrams.indexOf(button.parentElement) + 1;
        blob = new Blob([svg], { type: 'image/svg+xml' });
        filename = `diagram-${number}.svg`;
      } else {
        const image = button.parentElement.querySelector('img');
        const source = image.getAttribute('src').startsWith('data:')
          ? image.getAttribute('src')
          : button.dataset.source;
        const response = await fetch(source);
        if (!response.ok) throw new Error('Image request failed');
        blob = await response.blob();
        filename = button.dataset.filename;
        if (filename.startsWith('image-')) {
          const extension = blob.type.split('/')[1]?.split('+')[0] || 'bin';
          filename = `${filename}.${extension}`;
        }
        filename = filename.replace(/[\\/:*?"<>|]/g, '_');
      }
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch (_) {
      onNotice?.("Can't download this image from its source");
    }
  }

  return (
    <main
      className="preview-page"
      style={{ ['--md-maxw']: widthVar }}
      ref={previewRef}
      onClick={onClick}
    >
      <div className="preview-document">
        {mode === 'edit' ? (
          <div className="split">
            <div className="split-left">
              <CodeMirror
                value={text}
                onChange={(v) => setText(v)}
                extensions={extensions}
                theme={theme === 'dark' ? 'dark' : 'light'}
                height="100%"
              />
            </div>
            <div className="split-right">
              <div
                className="md-body"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            </div>
          </div>
        ) : (
          <div className="md-body" dangerouslySetInnerHTML={{ __html: html }} />
        )}
      </div>

      {showBackToTop && (
        <button
          className="btn secondary icon-btn preview-back-to-top"
          type="button"
          aria-label="Back to top"
          title="Back to top"
          onClick={goToTop}
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            arrow_upward
          </span>
        </button>
      )}

      {expandedTable !== null && expandedHtml && (
        <TableModal
          tableHtml={expandedHtml}
          tableIndex={expandedTable.index}
          tableState={tableState}
          setTableState={setTableState}
          opener={expandedTable.opener}
          onClose={() => setExpandedTable(null)}
        />
      )}

      <ZoomModal svgHtml={zoomSvg} onClose={() => setZoomSvg(null)} />
    </main>
  );
}
