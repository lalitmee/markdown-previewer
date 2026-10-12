export const HISTORY_LIMIT = 20;
const DB_NAME = 'mdpv-history';
const STORE = 'entries';

function normalizeLimit(limit) {
  return Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : HISTORY_LIMIT;
}

// Date.now() collides when two entries are added in the same millisecond, and the
// list() sort is not a total order on rank — a tie falls back to IndexedDB's
// alphabetical key order. Nudge the rank so every add is strictly newer.
let lastRank = 0;
function nextRank() {
  lastRank = Math.max(Date.now(), lastRank + 1);
  return lastRank;
}

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE, { keyPath: 'name' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function run(mode, fn) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const store = t.objectStore(STORE);
    const out = fn(store);
    t.oncomplete = () => resolve(out && out.result !== undefined ? out.result : out);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}

function rawList(store) {
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export function createHistory() {
  return {
    async list(limit = HISTORY_LIMIT) {
      try {
        const rows = await run('readonly', rawList);
        return rows.sort((a, b) => b.rank - a.rank).slice(0, normalizeLimit(limit));
      } catch (err) {
        if (err && (err.name === 'SecurityError' || err.name === 'InvalidStateError')) return [];
        throw err;
      }
    },

    async add(handle, location, limit = HISTORY_LIMIT) {
      if (!handle || !handle.name) return;
      const rows = await this.list(limit);
      const rest = rows.filter((e) => e.name !== handle.name);
      rest.unshift({ name: handle.name, kind: handle.kind || 'file', handle, rank: nextRank(), location });
      const want = rest.slice(0, normalizeLimit(limit));
      await run('readwrite', (store) => store.clear());
      for (const e of want) await run('readwrite', (store) => store.put(e));
    },

    async trim(limit = HISTORY_LIMIT) {
      const keep = normalizeLimit(limit);
      const rows = (await run('readonly', rawList)).sort((a, b) => b.rank - a.rank);
      const retained = rows.slice(0, keep);
      await run('readwrite', (store) => {
        for (const entry of rows.slice(keep)) store.delete(entry.name);
      });
      return retained;
    },

    async remove(name) {
      await run('readwrite', (store) => store.delete(name));
    },

    async clear() {
      await run('readwrite', (store) => store.clear());
    },
  };
}
