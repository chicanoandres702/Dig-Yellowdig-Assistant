#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');

const root = path.resolve(__dirname, '..');
const proxyFile = path.join(root, 'prebuilt', 'frontend', 'server.cjs');
const proxyPort = process.env.GEMINI_PROXY_PORT || 5174;

function checkProxy() {
  return new Promise((resolve) => {
    const req = http.request({ hostname: '127.0.0.1', port: proxyPort, path: '/health', method: 'GET', timeout: 1200 }, (res) => {
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

function startProxy() {
  if (!fs.existsSync(proxyFile)) {
    console.error(`proxy file not found: ${proxyFile}`);
    process.exitCode = 2;
    return null;
  }

  const node = process.execPath || 'node';
  const child = spawn(node, [proxyFile], {
    cwd: path.dirname(proxyFile),
    stdio: ['ignore', 'inherit', 'inherit'],
    detached: true,
  });

  child.unref();
  console.log(`started proxy (pid=${child.pid})`);
  return child;
}

function findEdge() {
  const candidates = [];
  if (process.platform === 'win32') {
    candidates.push('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe');
    candidates.push('C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe');
  } else if (process.platform === 'darwin') {
    candidates.push('/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge');
  } else {
    candidates.push('/usr/bin/microsoft-edge');
    candidates.push('/usr/bin/edge');
    candidates.push('/snap/bin/microsoft-edge');
  }
  for (const p of candidates) if (fs.existsSync(p)) return p;
  return null;
}

function launchEdge(edgePath, extraArgs = []) {
  const args = [
    `--user-data-dir=${path.join(root, '.vscode', 'edge-profile')}`,
    `--disable-extensions-except=${root}`,
    `--load-extension=${root}`,
    `--remote-debugging-port=9222`,
    ...extraArgs,
  ];
  try {
    const child = spawn(edgePath, args, { detached: true, stdio: 'ignore' });
    child.unref();
    console.log(`launched Edge: ${edgePath}`);
    return child;
  } catch (e) {
    console.error('failed to launch Edge', e);
    return null;
  }
}

async function main() {
  const noOpen = process.argv.includes('--no-open');
  const noProxy = process.argv.includes('--no-proxy');

  // If proxy already running, skip starting it.
  if (!noProxy) {
    const ok = await checkProxy();
    if (ok) {
      console.log(`proxy already running at http://localhost:${proxyPort}`);
    } else {
      console.log('proxy not running — starting...');
      startProxy();
      // wait for health to become available (up to ~30s)
      const maxAttempts = 60;
      for (let i = 0; i < maxAttempts; i++) {
        const up = await checkProxy();
        if (up) {
          console.log('proxy is healthy');
          break;
        }
        if (i === maxAttempts - 1) console.warn('proxy did not become healthy in time');
        await new Promise((r) => setTimeout(r, 500));
      }
    }
  }

  if (noOpen) {
    console.log('--no-open: skipping opening browser/extension');
    return;
  }

  const edge = findEdge();
  if (!edge) {
    console.warn('Microsoft Edge not found; please open your browser and load the unpacked extension manually.');
    return;
  }

  launchEdge(edge);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
