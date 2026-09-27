import { useEffect, useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { EditorView } from '@codemirror/view';
import { renderMarkdown } from '../lib/markdown';
import { inlineImages } from '../lib/fs-access';
import ZoomModal from './ZoomModal';

export default function Preview({ entry, text, setText, theme, files, mode, onMode, editorFont, widthVar }) {
  const [html, setHtml] = useState('');
  const [zoomSvg, setZoomSvg] = useState(null);

  const fontTheme = EditorView.theme({ '.cm-content': { fontFamily: editorFont } });
  const extensions = [markdown(), fontTheme];

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const rendered = await renderMarkdown(text, theme);
      const inlined = await inlineImages(rendered, files, entry ? entry.path : '');
      if (!cancelled) setHtml(inlined);
    })();
    return () => { cancelled = true; };
  }, [text, theme, entry, files]);

  function onBodyClick(e) {
    const diagram = e.target.closest('.mdiagram');
    if (!diagram) return;
    const svgChild = diagram.querySelector('svg');
    if (svgChild) {
      const clone = svgChild.cloneNode(true);
      clone.removeAttribute('style');
      setZoomSvg(clone.outerHTML);
    }
  }

  return (
    <main className="preview-page" style={{ ['--md-maxw']: widthVar }}>
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
          <div className="split-right"><div className="md-body" dangerouslySetInnerHTML={{ __html: html }} onClick={onBodyClick} /></div>
        </div>
      ) : (
        <div className="md-body" dangerouslySetInnerHTML={{ __html: html }} onClick={onBodyClick} />
      )}

      <ZoomModal svgHtml={zoomSvg} onClose={() => setZoomSvg(null)} />
    </main>
  );
}