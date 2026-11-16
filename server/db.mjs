import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export function openDatabase(path) {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(path);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
  const version = db.prepare('PRAGMA user_version').get().user_version;
  if (version > 1) throw new Error('La base de datos pertenece a una versión más reciente de la aplicación.');
  db.exec(`
    BEGIN;
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY CHECK(id=1),
      certification TEXT NOT NULL DEFAULT 'ab-410',
      theme TEXT NOT NULL DEFAULT 'system' CHECK(theme IN ('system','dark','light'))
    );
    INSERT OR IGNORE INTO settings(id) VALUES(1);
    CREATE TABLE IF NOT EXISTS study (
      certification TEXT NOT NULL,
      lesson_id TEXT NOT NULL,
      block_index INTEGER NOT NULL DEFAULT 0,
      completed INTEGER NOT NULL DEFAULT 0 CHECK(completed IN (0,1)),
      updated_at TEXT NOT NULL,
      PRIMARY KEY(certification, lesson_id)
    );
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      certification TEXT NOT NULL,
      mode TEXT NOT NULL CHECK(mode IN ('practice','exam')),
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','completed')),
      questions TEXT NOT NULL,
      cursor INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      deadline TEXT,
      completed_at TEXT
    );
    CREATE TABLE IF NOT EXISTS attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL REFERENCES sessions(id),
      question_id TEXT NOT NULL,
      selected INTEGER NOT NULL,
      difficulty INTEGER NOT NULL CHECK(difficulty BETWEEN 1 AND 3),
      correct INTEGER NOT NULL CHECK(correct IN (0,1)),
      duration_ms INTEGER NOT NULL CHECK(duration_ms >= 0),
      created_at TEXT NOT NULL,
      UNIQUE(session_id, question_id)
    );
    CREATE INDEX IF NOT EXISTS attempts_session ON attempts(session_id);
    CREATE INDEX IF NOT EXISTS sessions_certification ON sessions(certification);
    PRAGMA user_version = 1;
    COMMIT;
  `);
  return db;
}

export function transaction(db, fn) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const value = fn();
    db.exec('COMMIT');
    return value;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
