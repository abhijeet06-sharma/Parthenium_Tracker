const { query, initDb } = require('./db');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

async function seedAdmin() {
    await initDb();

    const email = 'admin@example.com';
    const password = 'admin';
    const name = 'Master Admin';

    try {
        // Check if exists
        const result = await query('SELECT * FROM users WHERE email = ?', [email]);
        if (result.rows.length > 0) {
            console.log('Admin already exists');
            return;
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const id = uuidv4();

        await query('INSERT INTO users (id, name, email, password_hash, role, trust_score) VALUES (?, ?, ?, ?, ?, ?)',
            [id, name, email, hashedPassword, 'ADMIN', 100]);

        console.log(`Admin created: ${email} / ${password}`);
    } catch (err) {
        console.error('Error seeding admin:', err);
    } finally {
        process.exit(0);
    }
}

seedAdmin();
