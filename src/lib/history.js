export const HISTORY_LIMIT = 20;
const DB_NAME = 'mdpv-history';
const STORE = 'entries';

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
    async list() {
      try {
        const rows = await run('readonly', rawList);
        return rows.sort((a, b) => b.rank - a.rank);
      } catch (err) {
        if (err && (err.name === 'SecurityError' || err.name === 'InvalidStateError')) return [];
        throw err;
      }
    },

    async add(handle) {
      if (!handle || !handle.name) return;
      const rows = await this.list();
      const rest = rows.filter((e) => e.name !== handle.name);
      rest.unshift({ name: handle.name, kind: handle.kind || 'file', handle, rank: Date.now() });
      const want = rest.slice(0, HISTORY_LIMIT);
      await run('readwrite', (store) => store.clear());
      for (const e of want) await run('readwrite', (store) => store.put(e));
    },

    async remove(name) {
      await run('readwrite', (store) => store.delete(name));
    },

    async clear() {
      await run('readwrite', (store) => store.clear());
    },
  };
}