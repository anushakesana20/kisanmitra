'use strict';
const fs   = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

const DB_PATH = path.resolve(process.env.DB_PATH || './db/kisanmitra.db');
let db = null;

/* ── Persist db to disk ─────────────────────────── */
function saveDb () {
  if (!db) return;
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

/* ── Auto-save every 30 s ─────────────────────────── */
let saveTimer = null;
function scheduleSave () {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(saveDb, 30_000);
}

/* ── Wrap run/get/all to auto-schedule save ─────── */
const DB = {
  run (sql, params = []) {
    const stmt = db.prepare(sql);
    stmt.run(params);
    stmt.free();
    scheduleSave();
  },
  get (sql, params = []) {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    let row = null;
    if (stmt.step()) row = stmt.getAsObject();
    stmt.free();
    return row;
  },
  all (sql, params = []) {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    return rows;
  },
  saveNow () { saveDb(); }
};

/* ── Schema ─────────────────────────────────────── */
const SCHEMA = `
PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS users (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  mobile       TEXT    UNIQUE NOT NULL,
  password_hash TEXT   NOT NULL,
  name         TEXT    NOT NULL,
  fname        TEXT    DEFAULT '',
  lname        TEXT    DEFAULT '',
  village      TEXT    DEFAULT '',
  district     TEXT    DEFAULT '',
  state        TEXT    DEFAULT '',
  land_acres   REAL    DEFAULT 0,
  crops        TEXT    DEFAULT '',
  lang         TEXT    DEFAULT 'en',
  avatar_b64   TEXT    DEFAULT '',
  lat          REAL    DEFAULT NULL,
  lon          REAL    DEFAULT NULL,
  location_city TEXT   DEFAULT '',
  location_district TEXT DEFAULT '',
  location_state TEXT  DEFAULT '',
  joined_at    TEXT    DEFAULT (datetime('now')),
  updated_at   TEXT    DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash   TEXT    NOT NULL,
  created_at   TEXT    DEFAULT (datetime('now')),
  expires_at   TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS notifications (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type         TEXT    NOT NULL DEFAULT 'info',
  severity     TEXT    NOT NULL DEFAULT 'low',
  icon         TEXT    DEFAULT '🔔',
  title        TEXT    NOT NULL,
  body         TEXT    NOT NULL DEFAULT '',
  is_read      INTEGER DEFAULT 0,
  created_at   TEXT    DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tasks (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name         TEXT    NOT NULL,
  due_date     TEXT    NOT NULL,
  category     TEXT    DEFAULT 'other',
  notes        TEXT    DEFAULT '',
  is_done      INTEGER DEFAULT 0,
  created_at   TEXT    DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS soil_data (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id      INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  oc           REAL    DEFAULT NULL,
  nitrogen     REAL    DEFAULT NULL,
  phosphorus   REAL    DEFAULT NULL,
  potassium    REAL    DEFAULT NULL,
  ph           REAL    DEFAULT NULL,
  zinc         REAL    DEFAULT NULL,
  updated_at   TEXT    DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expert_idx   INTEGER NOT NULL DEFAULT 0,
  role         TEXT    NOT NULL,
  message      TEXT    NOT NULL,
  created_at   TEXT    DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_notif_user    ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_tasks_user    ON tasks(user_id, due_date);
CREATE INDEX IF NOT EXISTS idx_chat_user_exp ON chat_messages(user_id, expert_idx);
`;

/* ── Boot ───────────────────────────────────────── */
async function initDb () {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  /* Apply schema (idempotent) */
  db.run(SCHEMA);
  saveDb();

  console.log(`✅  Database ready at ${DB_PATH}`);
  return DB;
}

module.exports = { initDb, getDb: () => DB };
