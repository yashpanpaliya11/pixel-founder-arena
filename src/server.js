import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const publicDir = fileURLToPath(new URL('../public/', import.meta.url));
const staticFiles = { '/': ['index.html', 'text/html; charset=utf-8'], '/app.js': ['app.js', 'text/javascript; charset=utf-8'], '/style.css': ['style.css', 'text/css; charset=utf-8'], '/assets/founders.png': ['assets/founders.png', 'image/png'], '/assets/tech.png': ['assets/tech.png', 'image/png'] };
const samples = {
  syntax: 'SyntaxError: Unexpected token ")"\n    at example.js:12:8',
  reference: 'ReferenceError: total is not defined\n    at example.js:8:3',
  type: "TypeError: Cannot read properties of undefined (reading 'name')\n    at example.js:5:15",
  module: "Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'missing-package' imported from example.js:1:1",
  test: 'AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n2 !== 3\n    at example.test.js:7:10',
  range: 'RangeError: Maximum call stack size exceeded\n    at example.js:3:5',
};

export async function startServer(arena, { port = 0 } = {}) {
  const token = randomBytes(24).toString('hex');
  const clients = new Set();
  let origin;
  const json = (res, status, data) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(data)); };
  const server = createServer(async (req, res) => {
    try {
      if (req.headers.host !== `127.0.0.1:${server.address().port}`) return json(res, 403, { error: 'Invalid host.' });
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Referrer-Policy', 'no-referrer');
      res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
      const url = new URL(req.url, origin);
      if (req.method === 'GET' && staticFiles[url.pathname]) {
        const [file, mime] = staticFiles[url.pathname];
        let content = await readFile(resolve(publicDir, file));
        if (file === 'index.html') content = Buffer.from(content.toString().replace('__ARENA_TOKEN__', token));
        res.writeHead(200, { 'Content-Type': mime, 'Cache-Control': 'no-store' }); return res.end(content);
      }
      if (req.method === 'GET' && url.pathname === '/favicon.ico') { res.writeHead(204); return res.end(); }
      if (url.pathname.startsWith('/api/')) {
        if (req.headers.origin && req.headers.origin !== origin) return json(res, 403, { error: 'Invalid origin.' });
        if ((req.headers['x-arena-token'] ?? url.searchParams.get('token')) !== token) return json(res, 403, { error: 'Invalid session token.' });
        if (req.method === 'GET' && url.pathname === '/api/state') return json(res, 200, arena.snapshot());
        if (req.method === 'GET' && url.pathname === '/api/events') {
          res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
          res.write(`event: state\ndata: ${JSON.stringify(arena.snapshot())}\n\n`);
          clients.add(res); req.on('close', () => clients.delete(res)); return;
        }
        if (req.method !== 'POST') return json(res, 404, { error: 'Route not found.' });
        if (!req.headers['content-type']?.startsWith('application/json')) return json(res, 415, { error: 'Use application/json.' });
        let raw = '';
        for await (const chunk of req) { raw += chunk; if (Buffer.byteLength(raw) > 16384) return json(res, 413, { error: 'Request too large.' }); }
        let body;
        try { body = JSON.parse(raw || '{}'); } catch { return json(res, 400, { error: 'Invalid JSON.' }); }
        if (!body || typeof body !== 'object' || Array.isArray(body)) return json(res, 400, { error: 'Expected a JSON object.' });
        switch (url.pathname) {
          case '/api/settings': arena.updateSettings(body); break;
          case '/api/project': arena.updateProject(body); break;
          case '/api/tasks': arena.task(body.action, body); break;
          case '/api/debate': arena.debate(body.topic); break;
          case '/api/demo': {
            if (body.category === 'success') arena.success({ demo: true });
            else if (samples[body.category]) arena.reportError(samples[body.category], { demo: true, force: true });
            else throw new Error('Unknown demo category.');
            break;
          }
          default: return json(res, 404, { error: 'Route not found.' });
        }
        return json(res, 200, arena.snapshot());
      }
      json(res, 404, { error: 'Not found.' });
    } catch (e) {
      if (!res.headersSent) json(res, e.code === 'ENOENT' ? 500 : 400, { error: e.code === 'ENOENT' ? 'An installed package asset is missing.' : e.message });
      else res.end();
    }
  });
  const send = (name, data) => { for (const client of clients) client.write(`event: ${name}\ndata: ${JSON.stringify(data)}\n\n`); };
  const onEvent = event => { send('arena', event); send('state', arena.snapshot()); };
  const onState = () => send('state', arena.snapshot());
  arena.on('event', onEvent); arena.on('state', onState);
  const heartbeat = setInterval(() => { for (const c of clients) c.write(': heartbeat\n\n'); }, 15000);
  heartbeat.unref();
  try { await new Promise((done, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', done); }); }
  catch (error) { clearInterval(heartbeat); arena.off('event', onEvent); arena.off('state', onState); throw error; }
  origin = `http://127.0.0.1:${server.address().port}`;
  return {
    url: origin, token, server,
    close: async () => { clearInterval(heartbeat); arena.off('event', onEvent); arena.off('state', onState); for (const c of clients) c.end(); clients.clear(); server.closeIdleConnections?.(); await new Promise(done => server.close(done)); },
  };
}
