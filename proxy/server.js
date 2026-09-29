const http = require('http');
const fs = require('fs');
const path = require('path');

// Load keys from .env (gitignored) or use empty pool
function loadKeys() {
  const envPath = path.join(__dirname, '..', '.env');
  const keys = [];
  if (fs.existsSync(envPath)) {
    const env = fs.readFileSync(envPath, 'utf8');
    env.split('\n').forEach(line => {
      const m = line.match(/^KEY_\d+=(.+)$/);
      if (m && m[1].trim()) {
        keys.push({
          email: `account${keys.length + 1}@placeholder.com`,
          key: m[1].trim(),
          session_status: 'active',
          access_tier: 'free',
          daily_limit: 200,
          today_used: 0,
          session_model: null,
          standing_label: null,
          last_usage: null,
          index: keys.length
        });
      }
    });
  }
  return keys;
}

let tokensData = loadKeys();
let currentIndex = 0;

function getNextKey() {
  if (tokensData.length === 0) return null;
  const key = tokensData[currentIndex % tokensData.length];
  currentIndex++;
  return key;
}

function handleRequest(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  // Admin API - list tokens
  if (url.pathname === '/admin/api/tokens') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ tokens: tokensData }));
    return;
  }

  // Admin API - add token
  if (url.pathname === '/admin/api/tokens' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        if (data.email && data.key) {
          tokensData.push({
            email: data.email,
            key: data.key,
            session_status: 'active',
            access_tier: data.access_tier || 'free',
            daily_limit: data.daily_limit || 200,
            today_used: 0,
            session_model: null,
            standing_label: null,
            last_usage: null,
            index: tokensData.length
          });
          res.writeHead(201, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true, index: tokensData.length - 1 }));
        } else {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'email and key required' }));
        }
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'invalid JSON' }));
      }
    });
    return;
  }

  // Admin API - delete token
  if (url.pathname.startsWith('/admin/api/tokens/') && req.method === 'DELETE') {
    const idx = parseInt(url.pathname.split('/').pop());
    if (tokensData[idx]) {
      tokensData.splice(idx, 1);
      tokensData.forEach((t, i) => t.index = i);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'not found' }));
    }
    return;
  }

  // OpenAI-compatible /v1/models
  if (url.pathname === '/v1/models') {
    const key = getNextKey();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      object: 'list',
      data: [
        { id: 'mimo-v2.6-flash-free', object: 'model', owned_by: 'opencode' },
        { id: 'ling-3.0-flash-fin-free', object: 'model', owned_by: 'opencode' },
        { id: 'nemotron-3.5-lightning-free', object: 'model', owned_by: 'opencode' }
      ]
    }));
    return;
  }

  // OpenAI-compatible /v1/chat/completions (proxy)
  if (url.pathname === '/v1/chat/completions' && req.method === 'POST') {
    const key = getNextKey();
    if (!key) {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'No keys configured. Add keys to .env or via admin API.' }));
      return;
    }
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      // In a real implementation, this would forward to the upstream API
      // For now, return a placeholder response
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        id: 'chatcmpl-' + Math.random().toString(36).slice(2),
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: 'mimo-v2.6-flash-free',
        choices: [{
          index: 0,
          message: { role: 'assistant', content: 'Proxy active. Key rotation working.' },
          finish_reason: 'stop'
        }],
        usage: { prompt_tokens: 0, completion_tokens: 8, total_tokens: 8 }
      }));
    });
    return;
  }

  // Serve dashboard
  if (url.pathname === '/' || url.pathname === '/dashboard') {
    const dashboardPath = path.join(__dirname, '..', 'freebuff-dashboard.html');
    if (fs.existsSync(dashboardPath)) {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(fs.readFileSync(dashboardPath));
    } else {
      res.writeHead(404);
      res.end('Dashboard not found');
    }
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
}

const PORT = process.env.PROXY_PORT || 8099;
http.createServer(handleRequest).listen(PORT, '0.0.0.0', () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);
  console.log(`Dashboard: http://localhost:${PORT}/`);
  console.log(`Admin API: http://localhost:${PORT}/admin/api/tokens`);
  console.log(`Loaded ${tokensData.length} keys from .env`);
});
