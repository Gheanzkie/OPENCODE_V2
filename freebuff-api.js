#!/usr/bin/env node
// freebuff local API — the pool/status backend freebuff-dashboard.html expects.
//   proxy  127.0.0.1:8081   GET /v1/models (OpenAI list), /admin (pool UI), /health
//   admin  127.0.0.1:8099   GET/POST /admin/api/tokens, /admin/api/status
// Pool persists in ./freebuff-pool.json (gitignored). Zero dependencies.
// Start: node freebuff-api.js   (or start-api.cmd / npm run api:freebuff)
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = __dirname;
const PROXY_PORT = Number(process.env.OC_FB_PROXY_PORT || 8081);
const ADMIN_PORT = Number(process.env.OC_FB_ADMIN_PORT || 8099);
const HOST = '127.0.0.1';
const STORE = path.join(ROOT, 'freebuff-pool.json');
const DASH = path.join(ROOT, 'freebuff-dashboard.html');

// Pool models — same catalog as cyberstrike.example.json -> provider.freebuff.models
const MODELS = [
  { id: 'deepseek/deepseek-v4-flash', name: 'DeepSeek V4 Flash', desc: 'Smart & Fast, unmetered free model', ctx: 1000000, out: 131072, daily: null },
  { id: 'mimo/mimo-v2.5', name: 'MiMo 2.5', desc: 'Balanced model, unlimited across all tiers', ctx: 1000000, out: 131072, daily: null },
  { id: 'openai/gpt-5.6-luna', name: 'GPT-5.6 Luna', desc: 'Strong all-around premium model (4/day quota)', ctx: 1000000, out: 131072, daily: 4 },
  { id: 'z-ai/glm-5.3-flash', name: 'GLM 5.3 Flash', desc: 'Deep reasoning, 2/day quota', ctx: 262144, out: 32000, daily: 2 },
  { id: 'upstage/solar-pro4', name: 'Solar Pro 4', desc: 'UpStage Solar Pro 4 (replaced GLM 5.2 in the free pool, limited daily quota)', ctx: 1000000, out: 131072, daily: null },
];

function todayKey() {
  const d = new Date();
  return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
}

function readStore() {
  let s = {};
  try { s = JSON.parse(fs.readFileSync(STORE, 'utf8')) || {}; } catch { s = {}; }
  if (!Array.isArray(s.tokens)) s.tokens = [];
  // local-midnight rollover: counters reset when the stored day changes
  if (s.day !== todayKey()) {
    s.day = todayKey();
    s.tokens.forEach(t => { t.today_used = 0; });
    writeStore(s);
  }
  return s;
}
function writeStore(s) {
  fs.writeFileSync(STORE, JSON.stringify(s, null, 2), 'utf8');
}

function normToken(raw, existing) {
  const email = String((raw && raw.email) || '').trim();
  if (!email) return null;
  const num = (v, d) => { const n = parseInt(v, 10); return Number.isFinite(n) ? n : d; };
  return {
    id: (existing && existing.id) || crypto.randomBytes(4).toString('hex'),
    email,
    access_tier: String((raw && (raw.access_tier || raw.tier)) || (existing && existing.access_tier) || 'limited'),
    daily_limit: num(raw && raw.daily_limit, (existing && existing.daily_limit) || 6),
    today_used: num(raw && raw.today_used, (existing && existing.today_used) || 0),
    session_status: String((raw && (raw.session_status || raw.status)) || (existing && existing.session_status) || 'active'),
    session_model: String((raw && raw.session_model) || (existing && existing.session_model) || ''),
    standing_label: String((raw && raw.standing_label) || (existing && existing.standing_label) || ''),
    last_usage: (raw && raw.last_usage != null) ? raw.last_usage : ((existing && existing.last_usage) || null),
  };
}

function send(res, code, obj, extraHeaders) {
  const body = typeof obj === 'string' ? obj : JSON.stringify(obj);
  res.writeHead(code, Object.assign({
    'Content-Type': (typeof obj === 'string' ? 'text/html; charset=utf-8' : 'application/json; charset=utf-8'),
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }, extraHeaders || {}));
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
function cors(req, res) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return true;
  }
  return false;
}

/* ---------------- proxy side :8081 ---------------- */
const proxyHandler = async (req, res) => {
  try {
    if (cors(req, res)) return;
    const url = new URL(req.url, 'http://127.0.0.1');
    const p = url.pathname;

    if (req.method === 'GET' && (p === '/v1/models' || p === '/v1/models/')) {
      send(res, 200, {
        object: 'list',
        data: MODELS.map(m => ({
          id: m.id,
          object: 'model',
          created: 1756300800,
          owned_by: 'freebuff',
          name: m.name,
          description: m.desc,
          limit: { context: m.ctx, output: m.out },
          daily_quota: m.daily,
        })),
      });
      return;
    }
    if (req.method === 'GET' && p.startsWith('/v1/models/')) {
      const id = decodeURIComponent(p.slice('/v1/models/'.length));
      const m = MODELS.find(x => x.id === id);
      if (!m) { send(res, 404, { error: { message: 'model not found: ' + id, type: 'invalid_request_error' } }); return; }
      send(res, 200, {
        id: m.id, object: 'model', created: 1756300800, owned_by: 'freebuff',
        name: m.name, description: m.desc, limit: { context: m.ctx, output: m.out }, daily_quota: m.daily,
      });
      return;
    }
    // pool/status API only — no upstream FreeBuff link, fail loudly instead of hanging
    if (req.method === 'POST' && /^\/v1\/(chat\/)?completions$/.test(p)) {
      send(res, 501, { error: { message: 'freebuff-api is the local pool/status API (no upstream linked). Point provider "freebuff" at a real freebuff-proxy for completions.', type: 'not_implemented', code: 'no_upstream' } });
      return;
    }
    if (req.method === 'GET' && (p === '/admin' || p === '/admin/' || p === '/' || p === '/freebuff-dashboard.html')) {
      if (fs.existsSync(DASH)) { send(res, 200, fs.readFileSync(DASH)); return; }
      send(res, 404, { error: 'freebuff-dashboard.html missing' });
      return;
    }
    if (req.method === 'GET' && p === '/health') {
      const s = readStore();
      send(res, 200, { ok: true, service: 'freebuff-api', proxy: PROXY_PORT, admin: ADMIN_PORT, models: MODELS.length, tokens: s.tokens.length, day: s.day, started: STARTED });
      return;
    }
    send(res, 404, { error: 'not found: ' + p, hint: 'try GET /v1/models, GET /admin, GET /health' });
  } catch (e) {
    send(res, 500, { error: String((e && e.message) || e) });
  }
};

/* ---------------- admin side :8099 ---------------- */
const adminHandler = async (req, res) => {
  try {
    if (cors(req, res)) return;
    const url = new URL(req.url, 'http://127.0.0.1');
    const p = url.pathname;

    if (req.method === 'GET' && p === '/admin/api/tokens') {
      const s = readStore();
      const tokens = s.tokens.map((t, i) => Object.assign({ index: i }, t));
      send(res, 200, { tokens, count: tokens.length, day: s.day });
      return;
    }
    if (req.method === 'POST' && p === '/admin/api/tokens') {
      let body = {};
      try { body = JSON.parse((await readBody(req)) || '{}'); } catch { send(res, 400, { error: 'bad json' }); return; }
      const incoming = Array.isArray(body) ? body : (Array.isArray(body.tokens) ? body.tokens : [body]);
      const s = readStore();
      let added = 0, updated = 0, skipped = 0;
      for (const raw of incoming) {
        const email = String((raw && raw.email) || '').trim();
        if (!email) { skipped++; continue; }
        const existing = s.tokens.find(t => t.email === email);
        const tok = normToken(raw, existing);
        if (!tok) { skipped++; continue; }
        if (existing) { Object.assign(existing, tok); updated++; } else { s.tokens.push(tok); added++; }
      }
      writeStore(s);
      send(res, 200, { ok: true, added, updated, skipped, tokens: s.tokens.map((t, i) => Object.assign({ index: i }, t)) });
      return;
    }
    if (req.method === 'POST' && p === '/admin/api/tokens/delete') {
      let body = {};
      try { body = JSON.parse((await readBody(req)) || '{}'); } catch { send(res, 400, { error: 'bad json' }); return; }
      const s = readStore();
      const before = s.tokens.length;
      if (body.email) s.tokens = s.tokens.filter(t => t.email !== String(body.email).trim());
      else if (body.id) s.tokens = s.tokens.filter(t => t.id !== body.id);
      else if (body.index != null) s.tokens = s.tokens.filter((_, i) => i !== Number(body.index));
      if (s.tokens.length === before) { send(res, 404, { error: 'token not found (need email, id or index)' }); return; }
      writeStore(s);
      send(res, 200, { ok: true, removed: before - s.tokens.length, tokens: s.tokens.map((t, i) => Object.assign({ index: i }, t)) });
      return;
    }
    if (req.method === 'POST' && p === '/admin/api/tokens/reset') {
      const s = readStore();
      let n = 0;
      s.tokens.forEach(t => { if (t.today_used) { t.today_used = 0; n++; } });
      writeStore(s);
      send(res, 200, { ok: true, reset: n, tokens: s.tokens.map((t, i) => Object.assign({ index: i }, t)) });
      return;
    }
    if (req.method === 'GET' && p === '/admin/api/status') {
      const s = readStore();
      send(res, 200, {
        ok: true, service: 'freebuff-api', day: s.day, tokens: s.tokens.length,
        active: s.tokens.filter(t => t.session_status === 'active').length,
        sessionsToday: s.tokens.reduce((n, t) => n + (t.today_used || 0), 0),
        ports: { proxy: PROXY_PORT, admin: ADMIN_PORT }, started: STARTED,
      });
      return;
    }
    send(res, 404, { error: 'not found: ' + p, hint: 'GET /admin/api/tokens · POST /admin/api/tokens · POST /admin/api/tokens/delete' });
  } catch (e) {
    send(res, 500, { error: String((e && e.message) || e) });
  }
};

/* ---------------- boot: both ports, loopback only ---------------- */
const STARTED = new Date().toISOString();
let listening = 0, failed = 0;
function boot(name, port, handler) {
  const server = http.createServer(handler);
  server.on('error', e => {
    if (e && e.code === 'EADDRINUSE') { failed++; console.log('[freebuff-api] ' + name + ' :' + port + ' already in use — assuming an instance is running'); }
    else { console.error('[freebuff-api] ' + name + ' ' + e); failed++; }
    done();
  });
  server.listen(port, HOST, () => { listening++; console.log('[freebuff-api] ' + name + ' http://' + HOST + ':' + port + '/'); done(); });
}
function done() {
  if (listening + failed < 2) return;
  if (listening === 0) process.exit(0); // both ports held elsewhere (other instance) — exit quiet
}
boot('proxy', PROXY_PORT, proxyHandler);
boot('admin', ADMIN_PORT, adminHandler);
