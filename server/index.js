'use strict';
require('dotenv').config();
const path        = require('path');
const fs          = require('fs');
const express     = require('express');
const helmet      = require('helmet');
const cors        = require('cors');
const cookieParser= require('cookie-parser');
const rateLimit   = require('express-rate-limit');
const { initDb }  = require('../db/database');

const app = express();
const PORT = process.env.PORT || 3000;

/* ── Security middleware ─────────────────────────── */
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:  ["'self'"],
      scriptSrc:   ["'self'", "'unsafe-inline'", 'fonts.googleapis.com'],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc:    ["'self'", "'unsafe-inline'", 'fonts.googleapis.com', 'fonts.gstatic.com'],
      fontSrc:     ["'self'", 'fonts.gstatic.com', 'fonts.googleapis.com'],
      imgSrc:      ["'self'", 'data:', 'blob:', '*'],
      connectSrc:  ["'self'", 'https://api.open-meteo.com', 'https://nominatim.openstreetmap.org', 'https://api.data.gov.in'],
    }
  }
}));

app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

/* ── Rate limiting ────────────────────────────────── */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { error: 'Too many attempts. Please try again in 15 minutes.' }
});
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120,
  message: { error: 'Rate limit exceeded. Please slow down.' }
});

/* ── Static files ─────────────────────────────────── */
app.use(express.static(path.join(__dirname, '../public')));

/* ── API Routes ───────────────────────────────────── */
app.use('/api/auth', authLimiter, require('../routes/auth'));
app.use('/api/users', apiLimiter, require('../routes/users'));
app.use('/api', apiLimiter, require('../routes/api'));

/* ── Health check ─────────────────────────────────── */
app.get('/health', (req, res) => {
  res.json({ status:'ok', time: new Date().toISOString(), version:'1.0.0' });
});

/* ── SPA fallback — serve index.html for all non-API routes ─ */
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

/* ── Global error handler ─────────────────────────── */
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error. Please try again.' });
});

/* ── Start ───────────────────────────────────────── */
initDb().then(() => {
  /* Ensure db directory exists */
  const dbDir = path.dirname(path.resolve(process.env.DB_PATH || './db/kisanmitra.db'));
  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

  app.listen(PORT, () => {
    console.log('');
    console.log('╔═══════════════════════════════════════╗');
    console.log('║   🌾 KisanMitra Server Started         ║');
    console.log(`║   http://localhost:${PORT}               ║`);
    console.log('╚═══════════════════════════════════════╝');
    console.log('');
  });
}).catch(err => {
  console.error('Failed to initialise database:', err);
  process.exit(1);
});

/* ── Graceful shutdown ────────────────────────────── */
process.on('SIGINT',  () => { const { getDb } = require('../db/database'); getDb().saveNow(); process.exit(0); });
process.on('SIGTERM', () => { const { getDb } = require('../db/database'); getDb().saveNow(); process.exit(0); });
