import { useEffect, useMemo, useState } from 'react';
import { App as CapApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import {
  DEFAULT_CATS, dbGet, dbSet, domain, mergeLinks, normalizeUrl, parseBackup, uid,
  type Backup, type Link, type Theme,
} from './lib';

type Tab = 'home' | 'fav' | 'cats' | 'settings';
type Dlg =
  | { k: 'form'; link?: Link } | { k: 'detail'; id: string } | { k: 'del'; id: string }
  | { k: 'cat'; old?: string } | { k: 'clear' } | { k: 'import'; data: Backup } | null;

const TABS: [Tab, string][] = [['home', 'Home'], ['fav', 'Favorites'], ['cats', 'Categories'], ['settings', 'Settings']];

export default function App() {
  const [links, setLinks] = useState<Link[]>([]);
  const [custom, setCustom] = useState<string[]>([]);
  const [theme, setTheme] = useState<Theme>('system');
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<Tab>('home');
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('All');
  const [dlg, setDlg] = useState<Dlg>(null);
  const [toast, setToast] = useState('');

  const say = (m: string) => { setToast(m); setTimeout(() => setToast(''), 2500); };
  const cats = [...DEFAULT_CATS, ...custom];

  useEffect(() => {
    Promise.all([dbGet<Link[]>('links', []), dbGet<string[]>('categories', []), dbGet<Theme>('theme', 'system')])
      .then(([l, c, t]) => { setLinks(l); setCustom(c); setTheme(t); setReady(true); })
      .catch(() => say('Storage is unavailable. Your changes may not be saved.'));
  }, []);

  useEffect(() => {
    const dark = theme === 'dark' || (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  }, [theme]);

  const commit = async (l: Link[], c: string[] = custom) => {
    try { await dbSet('links', l); await dbSet('categories', c); setLinks(l); setCustom(c); return true; }
    catch { say('Could not save your data. Please try again.'); return false; }
  };
  const changeTheme = (t: Theme) => { setTheme(t); dbSet('theme', t).catch(() => say('Could not save theme.')); };

  useEffect(() => {
    const h = CapApp.addListener('backButton', () => {
      if (dlg) setDlg(null); else if (tab !== 'home') setTab('home'); else CapApp.exitApp();
    });
    return () => { h.then((x) => x.remove()); };
  }, [dlg, tab]);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return links
      .filter((l) => (tab === 'fav' ? l.favorite : true))
      .filter((l) => filter === 'All' || l.category === filter)
      .filter((l) => !s || [l.title, l.url, l.category, l.notes].some((x) => x.toLowerCase().includes(s)))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [links, q, filter, tab]);

  const open = (l: Link) => window.open(l.url, '_blank', 'noopener');
  const copy = async (l: Link) => {
    try { await navigator.clipboard.writeText(l.url); say('URL copied'); } catch { say('Could not copy the URL.'); }
  };
  const fav = (l: Link) => commit(links.map((x) => (x.id === l.id ? { ...x, favorite: !x.favorite, updatedAt: new Date().toISOString() } : x)));

  const exportBackup = async () => {
    const data: Backup = { app: 'link-vault', version: 1, exportedAt: new Date().toISOString(), links, categories: custom };
    const name = `link-vault-backup-${new Date().toISOString().slice(0, 10)}.json`;
    const text = JSON.stringify(data, null, 2);
    try {
      if (Capacitor.isNativePlatform()) {
        const r = await Filesystem.writeFile({ path: name, data: text, directory: Directory.Cache, encoding: Encoding.UTF8 });
        await Share.share({ title: name, url: r.uri });
      } else {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
        a.download = name; a.click();
      }
    } catch { say('Could not export the backup.'); }
  };
  const pickBackup = (f?: File) => {
    if (!f) return;
    f.text().then((t) => setDlg({ k: 'import', data: parseBackup(t) })).catch(() => say('That file is not a valid Link Vault backup.'));
  };
  const doImport = async (data: Backup, replace: boolean) => {
    const nl = replace ? data.links : mergeLinks(links, data.links);
    const extra = data.categories.filter((c) => !DEFAULT_CATS.includes(c));
    const nc = replace ? extra : [...new Set([...custom, ...extra])];
    if (await commit(nl, nc)) { setDlg(null); say('Backup imported'); }
  };

  const cardOf = (l: Link) => (
    <div className="card" key={l.id}>
      <div onClick={() => setDlg({ k: 'detail', id: l.id })} role="button" tabIndex={0}>
        <h3>{l.favorite ? '★ ' : ''}{l.title}</h3>
        <div className="meta">{domain(l.url)} · {l.category}</div>
        {l.notes && <div className="meta">{l.notes.slice(0, 80)}</div>}
      </div>
      <div className="row">
        <button onClick={() => open(l)}>Open</button>
        <button onClick={() => copy(l)}>Copy</button>
        <button aria-label={l.favorite ? 'Remove from favorites' : 'Add to favorites'} onClick={() => fav(l)}>{l.favorite ? '★' : '☆'}</button>
        <button aria-label="Edit link" onClick={() => setDlg({ k: 'form', link: l })}>✎</button>
        <button className="danger" aria-label="Delete link" onClick={() => setDlg({ k: 'del', id: l.id })}>🗑</button>
      </div>
    </div>
  );

  if (!ready) return <div className="app"><header><h1>Link Vault</h1></header></div>;

  return (
    <div className="app">
      <header>
        <h1>{tab === 'home' ? 'Link Vault' : TABS.find((t) => t[0] === tab)![1]}</h1>
        {tab === 'home' && <p className="sub">Your links, organized.</p>}
      </header>

      {(tab === 'home' || tab === 'fav') && (
        <>
          {tab === 'home' && (
            <div className="stats">
              <div className="stat"><b>{links.length}</b>Total Links</div>
              <div className="stat"><b>{links.filter((l) => l.favorite).length}</b>Favorites</div>
            </div>
          )}
          <input type="search" aria-label="Search links" placeholder="Search links..." value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="chips">
            {['All', ...cats].map((c) => (
              <button key={c} className={`chip ${filter === c ? 'on' : ''}`} onClick={() => setFilter(c)}>{c}</button>
            ))}
          </div>
          {list.length ? list.map(cardOf) : (
            <div className="empty">
              {q ? <h2>No links found</h2> : tab === 'fav' ? <h2>No favorite links yet</h2> : (
                <>
                  <h2>No links yet</h2><p>Save your first important link to get started.</p>
                  <button className="primary" onClick={() => setDlg({ k: 'form' })}>+ Add Link</button>
                </>
              )}
            </div>
          )}
        </>
      )}

      {tab === 'cats' && (
        <>
          <button className="primary" onClick={() => setDlg({ k: 'cat' })}>+ New Category</button>
          {cats.map((c) => (
            <div className="card" key={c}>
              <h3>{c}</h3>
              <div className="meta">{links.filter((l) => l.category === c).length} links</div>
              {custom.includes(c) && (
                <div className="row">
                  <button onClick={() => setDlg({ k: 'cat', old: c })}>Rename</button>
                  <button className="danger" onClick={() => commit(links.map((l) => (l.category === c ? { ...l, category: 'Other' } : l)), custom.filter((x) => x !== c))}>Delete</button>
                </div>
              )}
            </div>
          ))}
          {!custom.length && <div className="empty">No custom categories yet</div>}
        </>
      )}

      {tab === 'settings' && (
        <>
          <h2>Appearance</h2>
          <div className="row">
            {(['light', 'dark', 'system'] as Theme[]).map((t) => (
              <button key={t} className={`chip ${theme === t ? 'on' : ''}`} onClick={() => changeTheme(t)}>{t[0].toUpperCase() + t.slice(1)}</button>
            ))}
          </div>
          <h2>Backup</h2>
          <div className="row">
            <button onClick={exportBackup}>Export Backup</button>
            <label className="row" style={{ margin: 0 }}>
              <span className="chip" style={{ display: 'inline-flex', alignItems: 'center', padding: '0 14px', border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--text)' }}>Import Backup</span>
              <input type="file" accept="application/json,.json" hidden onChange={(e) => { pickBackup(e.target.files?.[0]); e.target.value = ''; }} />
            </label>
          </div>
          <h2>Data</h2>
          <p className="meta">Total Links: {links.length}</p>
          <button className="danger" onClick={() => setDlg({ k: 'clear' })}>Clear All Data</button>
          <h2>About</h2>
          <p className="meta">Link Vault · Version 1.0.0 · Powered by Aizaz</p>
        </>
      )}

      {tab !== 'cats' && tab !== 'settings' && list.length > 0 && (
        <button className="primary fab" onClick={() => setDlg({ k: 'form' })}>+ Add Link</button>
      )}

      <nav>
        {TABS.map(([t, label]) => (
          <button key={t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>{label}</button>
        ))}
      </nav>

      {dlg && (
        <div className="overlay" onClick={() => setDlg(null)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            {dlg.k === 'form' && (
              <Form link={dlg.link} cats={cats} onCancel={() => setDlg(null)} onSave={async (v) => {
                const now = new Date().toISOString();
                const nl = dlg.link
                  ? links.map((x) => (x.id === dlg.link!.id ? { ...x, ...v, updatedAt: now } : x))
                  : [{ id: uid(), ...v, favorite: false, createdAt: now, updatedAt: now }, ...links];
                if (await commit(nl)) { setDlg(null); say('Link saved'); }
              }} />
            )}
            {dlg.k === 'detail' && (() => {
              const l = links.find((x) => x.id === dlg.id);
              if (!l) return null;
              return (
                <>
                  <h2>{l.title}</h2>
                  <p style={{ wordBreak: 'break-all' }}>{l.url}</p>
                  <p className="meta">{l.category}</p>
                  {l.notes && <p>{l.notes}</p>}
                  <p className="meta">Created {new Date(l.createdAt).toLocaleString()}<br />Updated {new Date(l.updatedAt).toLocaleString()}</p>
                  <div className="row">
                    <button className="primary" onClick={() => open(l)}>Open Link</button>
                    <button onClick={() => copy(l)}>Copy URL</button>
                    <button onClick={() => fav(l)}>{l.favorite ? '★ Unfavorite' : '☆ Favorite'}</button>
                    <button onClick={() => setDlg({ k: 'form', link: l })}>Edit</button>
                    <button className="danger" onClick={() => setDlg({ k: 'del', id: l.id })}>Delete</button>
                  </div>
                </>
              );
            })()}
            {dlg.k === 'del' && (
              <>
                <h2>Delete this link?</h2>
                <div className="row">
                  <button onClick={() => setDlg(null)}>Cancel</button>
                  <button className="danger" onClick={async () => { if (await commit(links.filter((l) => l.id !== dlg.id))) setDlg(null); }}>Delete</button>
                </div>
              </>
            )}
            {dlg.k === 'cat' && (
              <CatForm old={dlg.old} cats={cats} onCancel={() => setDlg(null)} onSave={async (name) => {
                const nc = dlg.old ? custom.map((c) => (c === dlg.old ? name : c)) : [...custom, name];
                const nl = dlg.old ? links.map((l) => (l.category === dlg.old ? { ...l, category: name } : l)) : links;
                if (await commit(nl, nc)) setDlg(null);
              }} />
            )}
            {dlg.k === 'clear' && (
              <>
                <h2>Clear all data?</h2>
                <p>This permanently deletes all {links.length} links and custom categories. Export a backup first if you might need them.</p>
                <div className="row">
                  <button onClick={() => setDlg(null)}>Cancel</button>
                  <button className="danger" onClick={async () => { if (await commit([], [])) { setDlg(null); setFilter('All'); } }}>Delete Everything</button>
                </div>
              </>
            )}
            {dlg.k === 'import' && (
              <>
                <h2>Import backup</h2>
                <p>This backup has {dlg.data.links.length} links. Merge keeps your current data; Replace erases it first.</p>
                <div className="row">
                  <button onClick={() => setDlg(null)}>Cancel</button>
                  <button className="primary" onClick={() => doImport(dlg.data, false)}>Merge</button>
                  <button className="danger" onClick={() => doImport(dlg.data, true)}>Replace</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}

function Form({ link, cats, onSave, onCancel }: {
  link?: Link; cats: string[]; onCancel: () => void;
  onSave: (v: { title: string; url: string; category: string; notes: string }) => void;
}) {
  const [title, setTitle] = useState(link?.title ?? '');
  const [url, setUrl] = useState(link?.url ?? '');
  const [category, setCategory] = useState(link?.category ?? 'Other');
  const [notes, setNotes] = useState(link?.notes ?? '');
  const [err, setErr] = useState('');
  const submit = () => {
    const u = normalizeUrl(url);
    if (!title.trim()) return setErr('Please enter a title.');
    if (!u) return setErr('Enter a valid link starting with http:// or https://');
    onSave({ title: title.trim(), url: u, category, notes: notes.trim() });
  };
  return (
    <>
      <h2>{link ? 'Edit Link' : 'Add Link'}</h2>
      <label htmlFor="t">Title</label><input id="t" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="My GitHub Project" />
      <label htmlFor="u">URL</label><input id="u" inputMode="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://github.com/example" />
      <label htmlFor="c">Category</label>
      <select id="c" value={category} onChange={(e) => setCategory(e.target.value)}>{cats.map((c) => <option key={c}>{c}</option>)}</select>
      <label htmlFor="n">Notes</label><textarea id="n" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
      {err && <div className="err" role="alert">{err}</div>}
      <div className="row"><button onClick={onCancel}>Cancel</button><button className="primary" onClick={submit}>Save Link</button></div>
    </>
  );
}

function CatForm({ old, cats, onSave, onCancel }: { old?: string; cats: string[]; onSave: (n: string) => void; onCancel: () => void }) {
  const [name, setName] = useState(old ?? '');
  const [err, setErr] = useState('');
  const submit = () => {
    const n = name.trim();
    if (!n) return setErr('Enter a category name.');
    if (cats.some((c) => c.toLowerCase() === n.toLowerCase() && c !== old)) return setErr('That category already exists.');
    onSave(n);
  };
  return (
    <>
      <h2>{old ? 'Rename Category' : 'New Category'}</h2>
      <input aria-label="Category name" value={name} onChange={(e) => setName(e.target.value)} />
      {err && <div className="err" role="alert">{err}</div>}
      <div className="row"><button onClick={onCancel}>Cancel</button><button className="primary" onClick={submit}>Save</button></div>
    </>
  );
}
