const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 4000;
const ADMIN_SECRET = process.env.ADMIN_SECRET || '';
const DB_FILE = path.join(__dirname, 'keys.json');

if (!ADMIN_SECRET) {
  console.warn('AVISO: variavel de ambiente ADMIN_SECRET nao definida. Defina uma senha forte antes de usar em producao.');
}

// ---------- persistencia simples em arquivo JSON ----------
function loadDB() {
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch (e) {
    return { keys: {} };
  }
}
function saveDB(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

// ---------- helpers ----------
function generateKeyString() {
  const part = () => crypto.randomBytes(2).toString('hex').toUpperCase();
  return `${part()}-${part()}-${part()}-${part()}`;
}

const DURATIONS_MS = {
  '24h': 24 * 60 * 60 * 1000,
  '1w': 7 * 24 * 60 * 60 * 1000,
  '1m': 30 * 24 * 60 * 60 * 1000
};

function requireAdmin(req, res, next) {
  const secret = req.headers['x-admin-secret'] || req.body.secret;
  if (!ADMIN_SECRET || secret !== ADMIN_SECRET) {
    return res.status(401).json({ success: false, error: 'Senha de admin invalida.' });
  }
  next();
}

function keyStatus(entry) {
  if (!entry) return { valid: false, reason: 'not_found' };
  if (!entry.active) return { valid: false, reason: 'deactivated', expiresAt: entry.expiresAt };
  if (entry.expiresAt && Date.now() > entry.expiresAt) return { valid: false, reason: 'expired', expiresAt: entry.expiresAt };
  return { valid: true, expiresAt: entry.expiresAt };
}

// ---------- rotas de admin (protegidas por senha) ----------

// gera uma nova chave. duration: "24h" | "1w" | "1m" | "custom" (com customHours)
app.post('/admin/generate', requireAdmin, (req, res) => {
  const { duration, customHours, note } = req.body;

  let ms;
  if (duration === 'custom') {
    const hours = Number(customHours);
    if (!hours || hours <= 0) {
      return res.status(400).json({ success: false, error: 'customHours invalido.' });
    }
    ms = hours * 60 * 60 * 1000;
  } else if (DURATIONS_MS[duration]) {
    ms = DURATIONS_MS[duration];
  } else {
    return res.status(400).json({ success: false, error: 'duration invalida. Use 24h, 1w, 1m ou custom.' });
  }

  const db = loadDB();
  const key = generateKeyString();
  const now = Date.now();

  db.keys[key] = {
    createdAt: now,
    expiresAt: now + ms,
    active: true,
    note: note || ''
  };
  saveDB(db);

  return res.json({ success: true, key, expiresAt: db.keys[key].expiresAt });
});

// desativa uma chave na hora
app.post('/admin/deactivate', requireAdmin, (req, res) => {
  const { key } = req.body;
  const db = loadDB();
  if (!db.keys[key]) return res.status(404).json({ success: false, error: 'Chave nao encontrada.' });

  db.keys[key].active = false;
  saveDB(db);
  return res.json({ success: true });
});

// reativa uma chave desativada (se ainda nao expirou)
app.post('/admin/activate', requireAdmin, (req, res) => {
  const { key } = req.body;
  const db = loadDB();
  if (!db.keys[key]) return res.status(404).json({ success: false, error: 'Chave nao encontrada.' });

  db.keys[key].active = true;
  saveDB(db);
  return res.json({ success: true });
});

// apaga uma chave definitivamente
app.post('/admin/delete', requireAdmin, (req, res) => {
  const { key } = req.body;
  const db = loadDB();
  delete db.keys[key];
  saveDB(db);
  return res.json({ success: true });
});

// lista todas as chaves
app.post('/admin/list', requireAdmin, (req, res) => {
  const db = loadDB();
  const list = Object.entries(db.keys).map(([key, entry]) => ({
    key,
    ...entry,
    status: keyStatus(entry)
  })).sort((a, b) => b.createdAt - a.createdAt);

  return res.json({ success: true, keys: list });
});

// ---------- rota publica usada pelos programas dos clientes ----------
app.post('/validate', (req, res) => {
  const { key } = req.body;
  if (!key) return res.status(400).json({ valid: false, reason: 'missing_key' });

  const db = loadDB();
  const status = keyStatus(db.keys[key]);
  return res.json(status);
});

app.get('/health', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Servidor de licenca rodando na porta ${PORT}`);
  console.log(`Painel de admin: http://localhost:${PORT}/admin.html`);
});
