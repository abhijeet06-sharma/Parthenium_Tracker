const Database = require('better-sqlite3');
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

let dbType = 'sqlite';
let sqliteDb;
let pgPool;

if (process.env.DATABASE_URL) {
    dbType = 'postgres';
    pgPool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    console.log('Using PostgreSQL database');
} else {
    console.log('Using SQLite database');
    const dbPath = path.join(__dirname, '..', 'database.sqlite');
    sqliteDb = new Database(dbPath);
}

// Unified Query Function
async function query(text, params = []) {
    if (dbType === 'postgres') {
        // Convert ? to $1, $2, etc. for Postgres
        let paramCount = 1;
        const pgText = text.replace(/\?/g, () => `$${paramCount++}`);
        try {
            const res = await pgPool.query(pgText, params);
            return { rows: res.rows, rowCount: res.rowCount };
        } catch (err) {
            // Normalize unique constraint error
            if (err.code === '23505') {
                const error = new Error('Unique constraint failed');
                error.code = 'SQLITE_CONSTRAINT_UNIQUE'; // Keep simple for existing logic
                throw error;
            }
            throw err;
        }
    } else {
        // SQLite Wrapper to mimic async/pg
        return new Promise((resolve, reject) => {
            try {
                const stmt = sqliteDb.prepare(text);
                if (text.trim().toLowerCase().startsWith('select')) {
                    const rows = stmt.all(params);
                    resolve({ rows, rowCount: rows.length });
                } else {
                    const info = stmt.run(params);
                    resolve({ rows: [], rowCount: info.changes, lastInsertRowid: info.lastInsertRowid });
                }
            } catch (err) {
                reject(err);
            }
        });
    }
}

async function initDb() {
    console.log('Initializing database tables...');

    // Users Table
    // Note: Postgres uses TIMESTAMPTZ or TIMESTAMP, SQLite uses TEXT/DATETIME. 
    // We use generic syntax compatible with both where possible, or rely on loose typing.
    const userTable = `
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT DEFAULT 'USER',
            trust_score INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_login TIMESTAMP
        )
    `;

    // Reports Table
    const reportsTable = `
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
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    `;

    // Action Logs Table
    const logsTable = `
        CREATE TABLE IF NOT EXISTS action_logs (
            id TEXT PRIMARY KEY,
            report_id TEXT NOT NULL,
            admin_id TEXT NOT NULL,
            action TEXT NOT NULL,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (report_id) REFERENCES reports(id),
            FOREIGN KEY (admin_id) REFERENCES users(id)
        )
    `;

    try {
        await query(userTable);
        await query(reportsTable);
        await query(logsTable);
        console.log('Database tables initialized successfully');
    } catch (err) {
        console.error('Error initializing database:', err);
    }
}

module.exports = { query, initDb };
