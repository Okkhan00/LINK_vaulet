export interface Link {
  id: string; title: string; url: string; category: string;
  notes: string; favorite: boolean; createdAt: string; updatedAt: string;
}
export interface Backup {
  app: 'link-vault'; version: 1; exportedAt: string; links: Link[]; categories: string[];
}
export type Theme = 'light' | 'dark' | 'system';

export const DEFAULT_CATS = ['Work', 'Personal', 'Projects', 'Social', 'Travel', 'Study', 'Other'];
export const uid = () => crypto.randomUUID();

export function normalizeUrl(s: string): string | null {
  try {
    const u = new URL(s.trim());
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.href : null;
  } catch { return null; }
}
export function domain(u: string): string {
  try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u; }
}

// ---- IndexedDB key-value storage ----
function openDb(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open('linkvault', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('kv');
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
export async function dbGet<T>(key: string, fallback: T): Promise<T> {
  const db = await openDb();
  return new Promise((res, rej) => {
    const q = db.transaction('kv').objectStore('kv').get(key);
    q.onsuccess = () => res((q.result as T | undefined) ?? fallback);
    q.onerror = () => rej(q.error);
  });
}
export async function dbSet(key: string, value: unknown): Promise<void> {
  const db = await openDb();
  return new Promise((res, rej) => {
    const tx = db.transaction('kv', 'readwrite');
    tx.objectStore('kv').put(value, key);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
}

// ---- Backup ----
const isStr = (v: unknown): v is string => typeof v === 'string';
function isLink(v: unknown): v is Link {
  const l = v as Link;
  return !!l && isStr(l.id) && isStr(l.title) && isStr(l.url) && isStr(l.category) &&
    isStr(l.notes) && typeof l.favorite === 'boolean' && isStr(l.createdAt) && isStr(l.updatedAt) &&
    normalizeUrl(l.url) !== null;
}
export function parseBackup(text: string): Backup {
  let d: Partial<Backup>;
  try { d = JSON.parse(text); } catch { throw new Error('invalid'); }
  if (d.app !== 'link-vault' || !Array.isArray(d.links) || !Array.isArray(d.categories)) throw new Error('invalid');
  if (!d.links.every(isLink) || !d.categories.every(isStr)) throw new Error('invalid');
  return d as Backup;
}
export function mergeLinks(existing: Link[], incoming: Link[]): Link[] {
  const ids = new Set(existing.map((l) => l.id));
  return [...existing, ...incoming.map((l) => (ids.has(l.id) ? { ...l, id: uid() } : l))];
}
