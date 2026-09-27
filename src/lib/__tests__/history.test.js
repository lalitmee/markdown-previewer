import { describe, it, expect, beforeEach } from 'vitest';
import { createHistory, HISTORY_LIMIT } from '../history';

function fakeHandle(name, kind = 'directory') {
  return { name, kind, __mock: true };
}

describe('history store', () => {
  let store;
  beforeEach(async () => {
    store = createHistory();
    await store.clear();
  });

  it('adds and lists entries newest first', async () => {
    await store.add(fakeHandle('one'));
    await store.add(fakeHandle('two'));
    const list = await store.list();
    expect(list.map((e) => e.name)).toEqual(['two', 'one']);
  });

  it('dedupes by name and moves the existing entry to the front', async () => {
    await store.add(fakeHandle('a'));
    await store.add(fakeHandle('b'));
    await store.add(fakeHandle('a', 'file'));
    const list = await store.list();
    expect(list).toHaveLength(2);
    expect(list[0]).toMatchObject({ name: 'a', kind: 'file' });
  });

  it('caps entries to the LRU limit', async () => {
    for (let i = 0; i < HISTORY_LIMIT + 5; i++) await store.add(fakeHandle('f' + i));
    const list = await store.list();
    expect(list).toHaveLength(HISTORY_LIMIT);
    expect(list[0].name).toBe('f' + (HISTORY_LIMIT + 4));
  });

  it('removes an entry by name', async () => {
    await store.add(fakeHandle('gone'));
    await store.remove('gone');
    expect(await store.list()).toEqual([]);
  });

  it('persists handles for round-trip (structured-clone objects)', async () => {
    await store.add(fakeHandle('persisted'));
    const fresh = createHistory();
    const list = await fresh.list();
    expect(list[0].name).toBe('persisted');
  });
});