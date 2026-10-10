import { useEffect, useRef, useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { EditorView } from '@codemirror/view';
import { renderMarkdown } from '../lib/markdown';
import { inlineImages } from '../lib/fs-access';
import {
  applyTableState,
  decorateTables,
  setColumnWidth,
  setColumnWidths,
  toggleColumnHidden,
} from '../lib/tableColumns';
import ZoomModal from './ZoomModal';

export default function Preview({ entry, text, setText, theme, folderHandle, mode, onMode, editorFont, widthVar }) {
  const [html, setHtml] = useState('');
  const [zoomSvg, setZoomSvg] = useState(null);
  const [tableState, setTableState] = useState({});
  const previewRef = useRef(null);

  const fontTheme = EditorView.theme({ '.cm-content': { fontFamily: editorFont } });
  const extensions = [markdown(), fontTheme];

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const rendered = await renderMarkdown(text, theme);
      const inlined = await inlineImages(rendered, folderHandle, entry ? entry.path : '');
      if (!cancelled) setHtml(inlined);
    })();
    return () => { cancelled = true; };
  }, [text, theme, entry, folderHandle]);

  // Structural pass: rebuild handles/colgroup/rail on the fresh DOM. Keyed on
  // html + mode only, so a column drag never rebuilds the handles it holds.
  useEffect(() => {
    if (!previewRef.current) return;
    previewRef.current.querySelectorAll('.md-body').forEach(decorateTables);
  }, [html, mode]);

  // Apply pass: cheap, runs after the structural pass and on every state change.
  useEffect(() => {
    if (!previewRef.current) return;
    previewRef.current.querySelectorAll('.md-body').forEach((b) => applyTableState(b, tableState));
  }, [tableState, html, mode]);

  function onPointerDown(e) {
    const handle = e.target.closest('.mp-resize');
    if (!handle) return;
    e.preventDefault();
    const t = Number(handle.dataset.t);
    const c = Number(handle.dataset.c);
    const startX = e.clientX;
    // Freeze every visible column at its current rendered width. The table is
    // then pinned to the sum of those widths, so dragging one handle only
    // changes that column and widens the table (the wrap scrolls) rather than
    // squeezing the others.
    const freeze = {};
    handle.closest('table').querySelectorAll('thead th').forEach((th, i) => {
      if (th.classList.contains('mp-col-hidden')) return;
      const w = Math.round(th.getBoundingClientRect().width);
      if (w > 0) freeze[i] = w;
    });
    const startW = freeze[c] ?? handle.parentElement.getBoundingClientRect().width;
    setTableState((s) => setColumnWidths(s, t, freeze));
    const onMove = (ev) => setTableState((s) => setColumnWidth(s, t, c, startW + (ev.clientX - startX)));
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  function onClick(e) {
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
    const toggle = e.target.closest('.mp-hide, .mp-chip');
    if (toggle) {
      setTableState((s) => toggleColumnHidden(s, Number(toggle.dataset.t), Number(toggle.dataset.c)));
    }
  }

  return (
    <main className="preview-page" style={{ ['--md-maxw']: widthVar }} ref={previewRef} onPointerDown={onPointerDown} onClick={onClick}>
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
          <div className="split-right"><div className="md-body" dangerouslySetInnerHTML={{ __html: html }} /></div>
        </div>
      ) : (
        <div className="md-body" dangerouslySetInnerHTML={{ __html: html }} />
      )}

      <ZoomModal svgHtml={zoomSvg} onClose={() => setZoomSvg(null)} />
    </main>
  );
}
