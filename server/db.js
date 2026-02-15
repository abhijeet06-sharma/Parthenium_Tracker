const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '..', 'database.sqlite');
const db = new Database(dbPath);

function initDb() {
    // Users Table
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT DEFAULT 'USER',
            trust_score INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_login DATETIME
        )
    `);

    // Reports Table
    db.exec(`
        CREATE TABLE IF NOT EXISTS reports (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            latitude REAL NOT NULL,
            longitude REAL NOT NULL,
            address TEXT,
            severity TEXT CHECK(severity IN ('LOW', 'MEDIUM', 'HIGH')),
            image_url TEXT,
            status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'VERIFIED', 'RESOLVED', 'REJECTED')),
            admin_notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    `);

    // Action Logs Table
    db.exec(`
        CREATE TABLE IF NOT EXISTS action_logs (
            id TEXT PRIMARY KEY,
            report_id TEXT NOT NULL,
            admin_id TEXT NOT NULL,
            action TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (report_id) REFERENCES reports(id),
            FOREIGN KEY (admin_id) REFERENCES users(id)
        )
    `);

    console.log('Database initialized successfully');
}

module.exports = { db, initDb };
