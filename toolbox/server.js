const express = require('express');
const crypto  = require('crypto');
const multer  = require('multer');
const cors    = require('cors');
const path    = require('path');

const app    = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ─── in-memory snippet store ───────────────────────────────────────────────
const snippets = new Map();
let  snippetCounter = 1;

// ─── /api/health ───────────────────────────────────────────────────────────
app.get('/api/health', (_, res) => res.json({ status: 'ok', uptime: process.uptime() }));

// ─── /api/hash  ────────────────────────────────────────────────────────────
app.post('/api/hash', (req, res) => {
  const { text, algorithms = ['sha256', 'sha1', 'sha512', 'md5'] } = req.body;
  if (!text) return res.status(400).json({ error: 'text required' });
  const result = {};
  for (const algo of algorithms) {
    try { result[algo] = crypto.createHash(algo).update(text, 'utf8').digest('hex'); }
    catch { result[algo] = 'unsupported'; }
  }
  res.json(result);
});

// ─── /api/diff  ────────────────────────────────────────────────────────────
app.post('/api/diff', (req, res) => {
  const { textA, textB } = req.body;
  if (textA === undefined || textB === undefined)
    return res.status(400).json({ error: 'textA and textB required' });

  const linesA = textA.split('\n');
  const linesB = textB.split('\n');

  // Myers-like LCS diff
  const lcs = computeLCS(linesA, linesB);
  const diff = buildDiff(linesA, linesB, lcs);

  const stats = {
    added:   diff.filter(d => d.type === 'add').length,
    removed: diff.filter(d => d.type === 'remove').length,
    equal:   diff.filter(d => d.type === 'equal').length,
  };

  res.json({ diff, stats });
});

function computeLCS(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Int32Array(n + 1));
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] + 1 : Math.max(dp[i-1][j], dp[i][j-1]);
  // backtrack
  const lcs = [];
  let i = m, j = n;
  while (i > 0 && j > 0) {
    if (a[i-1] === b[j-1]) { lcs.unshift([i-1, j-1]); i--; j--; }
    else if (dp[i-1][j] > dp[i][j-1]) i--;
    else j--;
  }
  return lcs;
}

function buildDiff(a, b, lcs) {
  const result = [];
  let ai = 0, bi = 0, li = 0;
  while (li < lcs.length) {
    const [la, lb] = lcs[li];
    while (ai < la) result.push({ type: 'remove', lineA: ai + 1, lineB: null,   text: a[ai++] });
    while (bi < lb) result.push({ type: 'add',    lineA: null,   lineB: bi + 1, text: b[bi++] });
    result.push({ type: 'equal', lineA: ai + 1, lineB: bi + 1, text: a[ai] });
    ai++; bi++; li++;
  }
  while (ai < a.length) result.push({ type: 'remove', lineA: ai + 1, lineB: null,   text: a[ai++] });
  while (bi < b.length) result.push({ type: 'add',    lineA: null,   lineB: bi + 1, text: b[bi++] });
  return result;
}

// ─── /api/snippets  ────────────────────────────────────────────────────────
app.post('/api/snippets', (req, res) => {
  const { title, content, language = 'text' } = req.body;
  if (!content) return res.status(400).json({ error: 'content required' });
  const id  = (snippetCounter++).toString(36).padStart(4, '0');
  const now = new Date().toISOString();
  snippets.set(id, { id, title: title || `Сниппет ${id}`, content, language, createdAt: now, updatedAt: now });
  res.json(snippets.get(id));
});

app.get('/api/snippets', (_, res) => {
  res.json([...snippets.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
});

app.get('/api/snippets/:id', (req, res) => {
  const s = snippets.get(req.params.id);
  s ? res.json(s) : res.status(404).json({ error: 'not found' });
});

app.put('/api/snippets/:id', (req, res) => {
  const s = snippets.get(req.params.id);
  if (!s) return res.status(404).json({ error: 'not found' });
  Object.assign(s, req.body, { id: s.id, updatedAt: new Date().toISOString() });
  res.json(s);
});

app.delete('/api/snippets/:id', (req, res) => {
  snippets.has(req.params.id) ? (snippets.delete(req.params.id), res.json({ ok: true }))
                               : res.status(404).json({ error: 'not found' });
});

// ─── /api/convert/json-csv  ────────────────────────────────────────────────
app.post('/api/convert/json-csv', (req, res) => {
  try {
    const data = req.body.data;
    if (!Array.isArray(data)) return res.status(400).json({ error: 'Expected array' });
    const keys = [...new Set(data.flatMap(Object.keys))];
    const escape = v => {
      const s = v == null ? '' : String(v);
      return (s.includes(',') || s.includes('"') || s.includes('\n')) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [keys.join(','), ...data.map(r => keys.map(k => escape(r[k])).join(','))].join('\n');
    res.json({ csv });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.post('/api/convert/csv-json', (req, res) => {
  try {
    const lines = req.body.csv.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const result  = lines.slice(1).map(line => {
      const vals = [];
      let cur = '', inQ = false;
      for (const ch of line) {
        if (ch === '"') inQ = !inQ;
        else if (ch === ',' && !inQ) { vals.push(cur.trim()); cur = ''; }
        else cur += ch;
      }
      vals.push(cur.trim());
      return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? '']));
    });
    res.json({ json: result });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// ─── /api/convert/file  (upload) ─────────────────────────────────────────
app.post('/api/convert/file', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });
  const { mimetype, originalname, buffer } = req.file;
  const text = buffer.toString('utf8');
  const ext  = path.extname(originalname).toLowerCase();

  try {
    if (ext === '.json') {
      // JSON → CSV
      const data = JSON.parse(text);
      if (!Array.isArray(data)) return res.json({ result: text, type: 'json', note: 'Not an array, returned as-is' });
      const keys  = [...new Set(data.flatMap(Object.keys))];
      const csv   = [keys.join(','), ...data.map(r => keys.map(k => r[k] ?? '').join(','))].join('\n');
      return res.json({ result: csv, type: 'csv', filename: originalname.replace('.json', '.csv') });
    }
    if (ext === '.csv') {
      const lines   = text.trim().split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      const result  = lines.slice(1).map(line => {
        const vals = line.split(',');
        return Object.fromEntries(headers.map((h, i) => [h, vals[i]?.trim() ?? '']));
      });
      return res.json({ result: JSON.stringify(result, null, 2), type: 'json', filename: originalname.replace('.csv', '.json') });
    }
    if (ext === '.md' || ext === '.markdown') {
      return res.json({ result: text, type: 'markdown', filename: originalname });
    }
    res.json({ result: text, type: 'text' });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// ─── SPA fallback ──────────────────────────────────────────────────────────
app.get('*', (_, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`\n🧰 TOOLBOX running → http://localhost:${PORT}\n`));
