import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbFile = process.env.DATABASE_FILE || path.join(__dirname, "../data/liferpg.sqlite");
fs.mkdirSync(path.dirname(dbFile), { recursive: true });

export const db = new Database(dbFile);
db.pragma("foreign_keys = ON");
db.exec(`
CREATE TABLE IF NOT EXISTS users (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 email TEXT NOT NULL UNIQUE,
 password_hash TEXT NOT NULL,
 name TEXT NOT NULL,
 xp INTEGER NOT NULL DEFAULT 0,
 level INTEGER NOT NULL DEFAULT 1,
 gold INTEGER NOT NULL DEFAULT 0,
 streak INTEGER NOT NULL DEFAULT 0,
 last_completed_date TEXT,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS tasks (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 user_id INTEGER NOT NULL,
 title TEXT NOT NULL,
 description TEXT DEFAULT '',
 attribute TEXT NOT NULL DEFAULT 'Discipline',
 xp INTEGER NOT NULL DEFAULT 25,
 gold INTEGER NOT NULL DEFAULT 10,
 completed INTEGER NOT NULL DEFAULT 0,
 completed_at TEXT,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS attributes (
 user_id INTEGER PRIMARY KEY,
 intellect INTEGER NOT NULL DEFAULT 1,
 strength INTEGER NOT NULL DEFAULT 1,
 discipline INTEGER NOT NULL DEFAULT 1,
 creativity INTEGER NOT NULL DEFAULT 1,
 FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS inventory (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 user_id INTEGER NOT NULL,
 item_name TEXT NOT NULL,
 cost INTEGER NOT NULL,
 purchased_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(user_id, item_name),
 FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
`);

export function levelForXp(xp) {
  let level = 1, total = 0;
  while (true) {
    const needed = 100 + (level - 1) * 75;
    if (xp < total + needed) return level;
    total += needed;
    level++;
  }
}
export function xpProgress(xp) {
  let level = levelForXp(xp), prior = 0;
  for (let l=1; l<level; l++) prior += 100 + (l-1)*75;
  const needed = 100 + (level-1)*75;
  return { level, current: xp-prior, needed };
}
