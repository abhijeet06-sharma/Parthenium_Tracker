const { db, initDb } = require('./db');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

initDb();

async function seedAdmin() {
    const email = 'admin@example.com';
    const password = 'admin';
    const name = 'Master Admin';

    // Check if exists
    const existing = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (existing) {
        console.log('Admin already exists');
        return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const id = uuidv4();

    db.prepare('INSERT INTO users (id, name, email, password_hash, role, trust_score) VALUES (?, ?, ?, ?, ?, ?)')
        .run(id, name, email, hashedPassword, 'ADMIN', 100);

    console.log(`Admin created: ${email} / ${password}`);
}

seedAdmin();
