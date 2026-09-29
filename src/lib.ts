export interface Link {
  id: string; title: string; url: string; category: string;
  notes: string; favorite: boolean; createdAt: string; updatedAt: string; deletedAt?: string;
}
export interface Recent { id: string; at: string }
export interface PinRec { salt: string; hash: string }
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

// ---- URL helpers ----
export function sameUrl(a: string, b: string): boolean {
  const n = (s: string) => {
    try { const u = new URL(s); return `${u.protocol}//${u.hostname.replace(/^www\./, '')}${u.pathname.replace(/\/+$/, '')}${u.search}`; }
    catch { return s; }
  };
  return n(a) === n(b);
}
export function extractShare(text: string): { url: string; title: string; category: string } | null {
  const m = text.match(/https?:\/\/[^\s]+/i);
  const url = m ? normalizeUrl(m[0].replace(/[).,;]+$/, '')) : null;
  if (!m || !url) return null;
  const t = text.replace(m[0], '').replace(/\s+/g, ' ').trim();
  const social = /(^|\.)(tiktok|instagram|facebook|twitter|x|reddit|snapchat|threads)\.(com|net)$/.test(new URL(url).hostname);
  return { url, title: t && t.length <= 120 ? t : domain(url), category: social ? 'Social' : 'Other' };
}

// ---- PIN (salted PBKDF2 hash; the PIN itself is never stored) ----
const hex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
async function derive(pin: string, salt: Uint8Array): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']);
  return hex(new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, key, 256)));
}
export async function makePin(pin: string): Promise<PinRec> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return { salt: hex(salt), hash: await derive(pin, salt) };
}
export async function checkPin(pin: string, rec: PinRec): Promise<boolean> {
  const salt = Uint8Array.from((rec.salt.match(/../g) ?? []).map((h) => parseInt(h, 16)));
  return (await derive(pin, salt)) === rec.hash;
}
