import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.resolve(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening SQLite database:', err.message);
  } else {
    console.log('Connected to SQLite database at:', dbPath);
    initializeSchema();
  }
});

// Helper functions to wrap sqlite3 callbacks in Promises
export const query = {
  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },
  
  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  },
  
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, changes: this.changes });
      });
    });
  },

  exec(sql) {
    return new Promise((resolve, reject) => {
      db.exec(sql, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
};

// Ordered, additive migrations. Each entry runs at most once (tracked in
// schema_migrations). Plain SQL only so the set ports to Postgres later.
// SQLite allows a single ADD COLUMN per ALTER statement — one per entry.
const MIGRATIONS = [
  {
    id: 1,
    sql: `
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        family_name TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        category TEXT NOT NULL,
        member TEXT NOT NULL,
        expiry_date TEXT NOT NULL,
        status TEXT NOT NULL,
        document_number TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS emails (
        id TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        sender TEXT NOT NULL,
        subject TEXT NOT NULL,
        date TEXT NOT NULL,
        body TEXT NOT NULL,
        read INTEGER DEFAULT 0,
        has_attachment INTEGER DEFAULT 0,
        attachment_name TEXT,
        processed INTEGER DEFAULT 0,
        icon TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        assignee TEXT NOT NULL,
        due_date TEXT NOT NULL,
        completed INTEGER DEFAULT 0,
        category TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      );
    `,
  },
  {
    id: 2,
    sql: `
      CREATE TABLE IF NOT EXISTS family_members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        role TEXT,
        color TEXT,
        avatar TEXT,
        is_child INTEGER DEFAULT 0,
        grade TEXT,
        school_email TEXT,
        aliases TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      );
    `,
  },
  { id: 3, sql: `ALTER TABLE tasks ADD COLUMN type TEXT DEFAULT 'task';` },
  { id: 4, sql: `ALTER TABLE tasks ADD COLUMN member_id INTEGER;` },
  { id: 5, sql: `ALTER TABLE tasks ADD COLUMN source_email_id TEXT;` },
  { id: 6, sql: `ALTER TABLE tasks ADD COLUMN urgency TEXT;` },
  { id: 7, sql: `ALTER TABLE tasks ADD COLUMN notes TEXT;` },
  { id: 8, sql: `ALTER TABLE tasks ADD COLUMN start_at TEXT;` },
  { id: 9, sql: `ALTER TABLE tasks ADD COLUMN end_at TEXT;` },
  { id: 10, sql: `ALTER TABLE emails ADD COLUMN category TEXT;` },
  {
    id: 11,
    sql: `
      CREATE TABLE IF NOT EXISTS reminders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        task_id TEXT,
        remind_at TEXT NOT NULL,
        channel TEXT DEFAULT 'push',
        status TEXT DEFAULT 'pending',
        sent_at TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      );
    `,
  },
  {
    id: 12,
    sql: `
      CREATE TABLE IF NOT EXISTS recipes (
        id TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        source_url TEXT,
        image TEXT,
        ingredients TEXT,
        steps TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      );
    `,
  },
  {
    id: 13,
    sql: `
      CREATE TABLE IF NOT EXISTS email_analyses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email_id TEXT NOT NULL,
        user_id INTEGER NOT NULL,
        analysis TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      );
    `,
  },
  {
    id: 14,
    sql: `
      CREATE TABLE IF NOT EXISTS chat_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      );
    `,
  },
];

async function initializeSchema() {
  try {
    await query.exec(
      'CREATE TABLE IF NOT EXISTS schema_migrations (id INTEGER PRIMARY KEY);'
    );

    for (const migration of MIGRATIONS) {
      const applied = await query.get(
        'SELECT id FROM schema_migrations WHERE id = ?',
        [migration.id]
      );
      if (applied) continue;

      await query.exec(migration.sql);
      await query.run('INSERT INTO schema_migrations (id) VALUES (?)', [migration.id]);
      console.log(`Applied migration ${migration.id}`);
    }

    console.log('SQLite database schema is up to date.');
  } catch (err) {
    console.error('Error running database migrations:', err.message);
  }
}

export default db;
