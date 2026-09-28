#!/usr/bin/env node
// opencode multi-account manager — local dashboard API (loopback only).
// Serves opencode-accounts.html (plus freebuff dashboard), stores accounts in
// ./opencode-accounts.json and the active key in ./auth.json (both gitignored,
// both INSIDE this folder). ./auth.json is canonical; writeAuth() also syncs a
// copy to ~/.local/share/opencode/auth.json so opencode itself still picks the
// applied key up (backup of the folder copy: ./auth.json.bak).
// Zero dependencies. Start: node accounts-server.js
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const ROOT = __dirname;
const PORT = Number(process.env.OC_ACCT_PORT || 8787);
const HOST = '127.0.0.1';
const VAULT = path.join(ROOT, 'opencode-accounts.json');
const AUTH = path.join(ROOT, 'auth.json');                                        // canonical — lives in this folder
const OPAUTH = path.join(os.homedir(), '.local', 'share', 'opencode', 'auth.json'); // opencode's own store (sync target)

const PAGES = {
  '/': 'opencode-accounts.html',
  '/index.html': 'opencode-accounts.html',
  '/opencode-accounts.html': 'opencode-accounts.html',
  '/freebuff-dashboard.html': 'freebuff-dashboard.html',
};

function readVault() {
  try {
    const v = JSON.parse(fs.readFileSync(VAULT, 'utf8'));
    return Array.isArray(v) ? v : (Array.isArray(v.accounts) ? v.accounts : []);
  } catch { return []; }
}
function writeVault(accounts) {
  fs.writeFileSync(VAULT, JSON.stringify({ accounts }, null, 2), 'utf8');
}
function readAuth() {
  reconcileAuth();
  try { return JSON.parse(fs.readFileSync(AUTH, 'utf8')); } catch { return {}; }
}
// Keep folder copy and opencode's store in sync:
//   - folder missing, opencode has one  -> migrate it INTO the folder
//   - opencode updated its own file     -> pull it back INTO the folder (mtime)
function reconcileAuth() {
  try {
    const inFolder = fs.existsSync(AUTH);
    const inOp = fs.existsSync(OPAUTH);
    if (!inFolder && inOp) { fs.copyFileSync(OPAUTH, AUTH); return; }
    if (inFolder && inOp) {
      const a = fs.statSync(AUTH).mtimeMs, b = fs.statSync(OPAUTH).mtimeMs;
      if (b > a + 2000) fs.copyFileSync(OPAUTH, AUTH);
    }
  } catch { /* best effort */ }
}
function writeAuth(auth) {
  // canonical copy first: INSIDE this folder (backup alongside it)
  if (!fs.existsSync(ROOT)) fs.mkdirSync(ROOT, { recursive: true });
  if (fs.existsSync(AUTH)) {
    try { fs.copyFileSync(AUTH, AUTH + '.bak'); } catch { /* best effort */ }
  }
  fs.writeFileSync(AUTH, JSON.stringify(auth, null, 2), 'utf8');
  // then sync to opencode's own store so the next launch picks the key up
  try {
    const dir = path.dirname(OPAUTH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.copyFileSync(AUTH, OPAUTH);
  } catch (e) { console.error('[accounts-server] opencode auth sync failed: ' + e); }
}
function activeInfo(accounts) {
  const auth = readAuth();
  for (const a of accounts) {
    const ent = auth[a.provider || 'opencode'];
    if (ent && ent.key && a.key && ent.key === a.key) {
      return { activeId: a.id, activeProvider: a.provider || 'opencode', activeMask: mask(a.key) };
    }
  }
  const providers = Object.keys(auth);
  if (providers.length) {
    const p = providers[0];
    const k = auth[p] && auth[p].key;
    if (k) return { activeId: null, activeProvider: p, activeMask: mask(k) };
  }
  return { activeId: null, activeProvider: null, activeMask: null };
}
function mask(k) {
  if (!k || k.length < 12) return '****';
  return k.slice(0, 7) + '…' + k.slice(-4);
}
function json(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(body);
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', c => { data += c; if (data.length > 2e6) { reject(new Error('body too large')); req.destroy(); } });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://127.0.0.1');
    const p = url.pathname;

    // CORS preflight (lets file:// copies of the dashboard hit the API too)
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      });
      res.end();
      return;
    }

    // ---- static pages (fixed map, no traversal) ----
    if (req.method === 'GET' && PAGES[p]) {
      const file = path.join(ROOT, PAGES[p]);
      if (fs.existsSync(file)) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
        res.end(fs.readFileSync(file));
        return;
      }
      json(res, 404, { error: 'page missing: ' + PAGES[p] });
      return;
    }

    // ---- API ----
    if (req.method === 'GET' && p === '/api/accounts') {
      const accounts = readVault();
      json(res, 200, { accounts, ...activeInfo(accounts), vault: VAULT, auth: AUTH, opencodeAuth: OPAUTH, authExists: fs.existsSync(AUTH) });
      return;
    }
    if (req.method === 'GET' && p === '/api/status') {
      reconcileAuth();
      const accounts = readVault();
      const auth = readAuth();
      json(res, 200, {
        ok: true, accounts: accounts.length, authExists: fs.existsSync(AUTH),
        providers: Object.keys(auth), ...activeInfo(accounts), port: PORT, root: ROOT,
        auth: AUTH, opencodeAuth: OPAUTH,
      });
      return;
    }
    if (req.method === 'POST' && (p === '/api/accounts' || p === '/api/accounts/delete')) {
      let body = {};
      try { body = JSON.parse((await readBody(req)) || '{}'); } catch { json(res, 400, { error: 'bad json' }); return; }

      if (p === '/api/accounts/delete') {
        const before = readVault();
        const after = before.filter(a => a.id !== body.id);
        if (after.length === before.length) { json(res, 404, { error: 'id not found' }); return; }
        writeVault(after);
        json(res, 200, { ok: true, accounts: after, ...activeInfo(after) });
        return;
      }

      // add / update single, or bulk import array
      const incoming = Array.isArray(body) ? body : (Array.isArray(body.accounts) ? body.accounts : [body]);
      const accounts = readVault();
      let added = 0, updated = 0;
      for (const raw of incoming) {
        const email = String(raw.email || '').trim();
        const key = String(raw.key || '').trim();
        if (!email || !key) continue;
        const provider = String(raw.provider || 'opencode').trim() || 'opencode';
        const note = String(raw.note || '').trim();
        const existing = accounts.find(a => a.email === email && a.provider === provider);
        if (existing) { existing.key = key; existing.note = note || existing.note; updated++; }
        else { accounts.push({ id: crypto.randomBytes(4).toString('hex'), email, provider, key, note, added: new Date().toISOString().slice(0, 10) }); added++; }
      }
      writeVault(accounts);
      json(res, 200, { ok: true, added, updated, accounts, ...activeInfo(accounts) });
      return;
    }
    if (req.method === 'POST' && p === '/api/apply') {
      let body = {};
      try { body = JSON.parse((await readBody(req)) || '{}'); } catch { json(res, 400, { error: 'bad json' }); return; }
      const accounts = readVault();
      const acct = accounts.find(a => a.id === body.id);
      if (!acct) { json(res, 404, { error: 'account not found' }); return; }
      const auth = readAuth();
      auth[acct.provider || 'opencode'] = { type: 'api', key: acct.key };
      writeAuth(auth);
      json(res, 200, { ok: true, applied: acct.email, provider: acct.provider || 'opencode', mask: mask(acct.key), accounts, ...activeInfo(accounts) });
      return;
    }
    if (req.method === 'POST' && p === '/api/clear') {
      let body = {};
      try { body = JSON.parse((await readBody(req)) || '{}'); } catch { json(res, 400, { error: 'bad json' }); return; }
      const auth = readAuth();
      const provider = body.provider || Object.keys(auth)[0];
      if (!provider || !auth[provider]) { json(res, 404, { error: 'no active key' }); return; }
      delete auth[provider];
      writeAuth(auth);
      const accounts = readVault();
      json(res, 200, { ok: true, cleared: provider, accounts, ...activeInfo(accounts) });
      return;
    }

    json(res, 404, { error: 'not found: ' + p });
  } catch (e) {
    json(res, 500, { error: String(e && e.message || e) });
  }
});

server.on('error', e => {
  if (e && e.code === 'EADDRINUSE') process.exit(0); // another instance already serves it
  console.error('[accounts-server] ' + e);
  process.exit(1);
});
server.listen(PORT, HOST, () => {
  reconcileAuth(); // pull an existing ~/.local/share/opencode/auth.json into this folder on first boot
  console.log('[accounts-server] http://' + HOST + ':' + PORT + '/  vault=' + VAULT + '  auth=' + AUTH);
});
