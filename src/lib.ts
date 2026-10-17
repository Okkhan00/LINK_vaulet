export interface Link {
  id: string; title: string; url: string; category: string;
  notes: string; favorite: boolean; createdAt: string; updatedAt: string; deletedAt?: string; platform?: string;
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

// ---- Platforms (detected locally from the URL; no network) ----
export const PLATFORMS: { name: string; color: string; mark: string; hosts: string[] }[] = [
  { name: 'Facebook', color: '#1877f2', mark: 'f', hosts: ['facebook.com', 'fb.watch', 'fb.com', 'fb.me'] },
  { name: 'TikTok', color: '#111111', mark: '♪', hosts: ['tiktok.com'] },
  { name: 'YouTube', color: '#e02424', mark: '▶', hosts: ['youtube.com', 'youtu.be'] },
  { name: 'Instagram', color: '#c13584', mark: '◎', hosts: ['instagram.com'] },
  { name: 'X', color: '#222222', mark: 'X', hosts: ['x.com', 'twitter.com', 't.co'] },
  { name: 'Reddit', color: '#ff4500', mark: 'r', hosts: ['reddit.com', 'redd.it'] },
  { name: 'Pinterest', color: '#e60023', mark: 'P', hosts: ['pinterest.com', 'pin.it'] },
  { name: 'LinkedIn', color: '#0a66c2', mark: 'in', hosts: ['linkedin.com', 'lnkd.in'] },
  { name: 'Telegram', color: '#229ed9', mark: '✈', hosts: ['t.me', 'telegram.me', 'telegram.org'] },
  { name: 'WhatsApp', color: '#25d366', mark: 'W', hosts: ['whatsapp.com', 'wa.me'] },
  { name: 'GitHub', color: '#333333', mark: 'GH', hosts: ['github.com'] },
  { name: 'Google', color: '#4285f4', mark: 'G', hosts: ['google.com', 'goo.gl', 'g.co'] },
  { name: 'Other', color: '#6b7190', mark: '🔗', hosts: [] },
];
export function detectPlatform(url: string): string {
  let h: string;
  try { h = new URL(url).hostname.toLowerCase(); } catch { return 'Other'; }
  return PLATFORMS.find((p) => p.hosts.some((d) => h === d || h.endsWith('.' + d)))?.name ?? 'Other';
}
/** Manual override wins; otherwise derived from the URL, so old links and old backups need no migration. */
export const platformOf = (l: Link): string =>
  l.platform && PLATFORMS.some((p) => p.name === l.platform) ? l.platform : detectPlatform(l.url);
export const matchesQuery = (l: Link, s: string): boolean =>
  !s || [l.title, l.url, l.category, l.notes, platformOf(l)].some((x) => x.toLowerCase().includes(s));
