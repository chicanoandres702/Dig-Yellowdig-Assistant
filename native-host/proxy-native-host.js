#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');

// Simple native messaging host to start/ensure a local proxy process for the extension.
// It implements Chrome native messaging framing over stdio.

const ROOT = path.resolve(__dirname, '..');
const PROXY_SCRIPT = path.join(ROOT, 'prebuilt', 'frontend', 'server.cjs');
const DEFAULT_PORT = Number(process.env.GEMINI_PROXY_PORT || 5174);

let proxyChild = null;

function sendMessage(msg) {
  try {
    const payload = Buffer.from(JSON.stringify(msg));
    const header = Buffer.alloc(4);
    header.writeUInt32LE(payload.length, 0);
    process.stdout.write(Buffer.concat([header, payload]));
  } catch (e) {
    // best-effort
  }
}

function startProxyDetached() {
  if (!fs.existsSync(PROXY_SCRIPT)) {
    throw new Error('proxy script not found: ' + PROXY_SCRIPT);
  }
  if (proxyChild && proxyChild.pid) return proxyChild;

  const node = process.execPath || 'node';
  const child = spawn(node, [PROXY_SCRIPT], {
    cwd: path.dirname(PROXY_SCRIPT),
    detached: true,
    stdio: ['ignore', 'inherit', 'inherit']
  });
  child.unref();
  proxyChild = child;
  return child;
}

function checkProxy(port = DEFAULT_PORT, timeout = 1000) {
  return new Promise((resolve) => {
    const req = http.request({ hostname: '127.0.0.1', port, path: '/health', method: 'GET', timeout }, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => {
        try {
          const j = JSON.parse(body);
          resolve(Boolean(j && j.ok));
        } catch (e) {
          resolve(false);
        }
      });
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
    req.end();
  });
}

async function handleMessage(msg) {
  try {
    const action = msg && msg.action ? msg.action : 'status';
    const port = Number(msg && msg.port ? msg.port : DEFAULT_PORT);
    if (action === 'ensure_running') {
      const ok = await checkProxy(port, 800);
      if (ok) {
        sendMessage({ ok: true, host: `http://127.0.0.1:${port}` });
        return;
      }
      try {
        const child = startProxyDetached();
        // wait up to ~20s for health
        const max = 40;
        for (let i = 0; i < max; i++) {
          const up = await checkProxy(port, 400);
          if (up) {
            sendMessage({ ok: true, host: `http://127.0.0.1:${port}`, pid: child && child.pid ? child.pid : null });
            return;
          }
          await new Promise(r => setTimeout(r, 500));
        }
        sendMessage({ ok: false, error: 'proxy did not become healthy in time' });
      } catch (err) {
        sendMessage({ ok: false, error: err && err.message ? err.message : String(err) });
      }
    } else if (action === 'status') {
      const up = await checkProxy(port, 400);
      sendMessage({ ok: up, host: `http://127.0.0.1:${port}` });
    } else {
      sendMessage({ ok: false, error: 'unknown action' });
    }
  } catch (err) {
    sendMessage({ ok: false, error: err && err.message ? err.message : String(err) });
  }
}

// Read framed messages from stdin
let buffer = Buffer.alloc(0);
process.stdin.on('data', (chunk) => {
  buffer = Buffer.concat([buffer, chunk]);
  while (buffer.length >= 4) {
    const msgLen = buffer.readUInt32LE(0);
    if (buffer.length >= 4 + msgLen) {
      const msgBuf = buffer.slice(4, 4 + msgLen);
      buffer = buffer.slice(4 + msgLen);
      try {
        const data = JSON.parse(msgBuf.toString());
        handleMessage(data);
      } catch (e) {
        sendMessage({ ok: false, error: 'invalid JSON: ' + (e && e.message) });
      }
    } else {
      break;
    }
  }
});

process.stdin.on('end', () => { process.exit(0); });

// If started without messages, proactively ensure proxy running
(async () => {
  try {
    await handleMessage({ action: 'ensure_running', port: DEFAULT_PORT });
  } catch (e) { /* ignore */ }
})();
