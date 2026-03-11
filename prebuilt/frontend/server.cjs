#!/usr/bin/env node
/**
 * Simple Gemini proxy server (CommonJS).
 *
 * Usage: set GEMINI_API_KEY in prebuilt/frontend/.env.local (this file is gitignored)
 * then run `npm run serve-proxy` from the prebuilt/frontend folder.
 */
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

const KEY = process.env.GEMINI_API_KEY;
if (!KEY) console.warn('[gemini-proxy] Warning: GEMINI_API_KEY not set in .env.local');

app.post('/api/gemini', async (req, res) => {
  try {
    const { model, payload } = req.body || {};
    if (!model || !payload) return res.status(400).json({ error: 'Missing model or payload' });
    if (!KEY) return res.status(500).json({ error: 'Server-side GEMINI_API_KEY not configured' });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(KEY)}`;

    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await r.json();
    res.status(r.status).json(data);
  } catch (err) {
    console.error('[gemini-proxy] error', err);
    res.status(500).json({ error: String(err) });
  }
});

app.get('/health', (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 5174;
app.listen(PORT, () => console.log(`[gemini-proxy] listening on http://localhost:${PORT}`));
