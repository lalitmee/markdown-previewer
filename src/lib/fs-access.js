import { isMarkdownName } from './search';

export function isFsaSupported() {
  return typeof window !== 'undefined' &&
    'showDirectoryPicker' in window && 'showOpenFilePicker' in window;
}

export async function pickSingleFile() {
  try {
    const [handle] = await window.showOpenFilePicker({
      multiple: false,
      types: [{
        description: 'Markdown files',
        accept: { 'text/markdown': ['.md', '.markdown', '.mdown', '.mkd'] },
      }],
    });
    return handle;
  } catch (err) {
    if (err && err.name === 'AbortError') return null;
    throw err;
  }
}

export async function pickFolder() {
  try {
    return await window.showDirectoryPicker({ mode: 'readwrite' });
  } catch (err) {
    if (err && err.name === 'AbortError') return null;
    throw err;
  }
}

export async function requestPermission(handle, readwrite = false) {
  const opts = { mode: readwrite ? 'readwrite' : 'read' };
  return handle.queryPermission(opts) === 'granted' ||
         (await handle.requestPermission(opts)) === 'granted';
}

function readHandleFile(handle) {
  return new Promise((resolve, reject) => {
    handle.getFile().then((file) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => reject(r.error || new Error('read failed'));
      r.readAsText(file);
    }, reject);
  });
}

export async function readFileText(handle) {
  return readHandleFile(handle);
}

export async function listMdFiles(dirHandle) {
  const out = [];
  async function walk(dir, prefix) {
    for await (const entry of dir.values()) {
      const path = prefix ? prefix + '/' + entry.name : entry.name;
      if (entry.kind === 'file') {
        if (isMarkdownName(entry.name)) out.push({ name: entry.name, path, handle: entry });
      } else if (entry.kind === 'directory') {
        await walk(entry, path);
      }
    }
  }
  await walk(dirHandle, '');
  out.sort((a, b) => a.path.localeCompare(b.path));
  return out;
}

export async function readImageDataUrl(fileHandle, baseDir, path) {
  const key = (baseDir ? baseDir + '/' : '') + path;
  try {
    const h = await fileHandle.getFileHandle(key.toLowerCase());
    const file = await h.getFile();
    if (!file.type.startsWith('image/')) return null;
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => reject(r.error);
      r.readAsDataURL(file);
    });
  } catch (_) {
    return null;
  }
}

export async function saveFileText(fileHandle, text) {
  const writable = await fileHandle.createWritable();
  await writable.write(text);
  await writable.close();
}

export async function readImageDataUrlFromFile(file) {
  if (!file || !file.type.startsWith('image/')) return null;
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

/**
 * Replace relative img srcs in rendered html with data URLs read from the
 * folder's file handles. External/data/blob URLs are left untouched.
 */
export async function inlineImages(html, files, activePath) {
  const container = document.createElement('div');
  container.innerHTML = html;
  const imgs = Array.from(container.querySelectorAll('img'));
  await Promise.all(imgs.map(async (img) => {
    const src = img.getAttribute('src');
    const rel = resolveRelFrom(dirOf(activePath), src);
    if (!rel) return;
    const f = files.find((x) => x.path.toLowerCase() === rel);
    if (!f) return;
    try {
      const file = await f.handle.getFile();
      const data = await readImageDataUrlFromFile(file);
      if (data) img.setAttribute('src', data);
    } catch (_) { /* keep as-is */ }
  }));
  return container.innerHTML;
}

function dirOf(path) {
  const i = String(path).lastIndexOf('/');
  return i < 0 ? '' : path.slice(0, i);
}

function resolveRelFrom(baseDir, src) {
  const clean = String(src || '').split('#')[0].split('?')[0];
  if (!clean.trim() || /^(https?:|data:|blob:)/i.test(clean)) return null;
  const parts = (baseDir ? baseDir + '/' + clean : clean).split('/');
  const out = [];
  for (const p of parts) {
    if (!p || p === '.') continue;
    if (p === '..') out.pop();
    else out.push(p);
  }
  return out.join('/').toLowerCase();
}