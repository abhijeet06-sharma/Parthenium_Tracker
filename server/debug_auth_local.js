const { query, initDb } = require('./db');
const bcrypt = require('bcryptjs');

async function debugAuth() {
    console.log('--- Starting Auth Debug ---');

    // 1. Ensure DB Init
    await initDb();

    // 2. Check for Admin
    const email = 'admin@example.com';
    const password = 'admin';

    console.log(`Checking user: ${email}`);
    const result = await query('SELECT * FROM users WHERE email = ?', [email]);
    const user = result.rows[0];

    if (!user) {
        console.error('❌ Admin user NOT found in DB.');
    } else {
        console.log('✅ Admin user FOUND in DB.');
        console.log('Stored Hash:', user.password_hash);

        // 3. Verify Password
        const isMatch = await bcrypt.compare(password, user.password_hash);
        console.log(`Password '${password}' match result: ${isMatch ? '✅ MATCH' : '❌ FAIL'}`);
    }

    console.log('--- End Debug ---');
}

debugAuth();
