const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDb } = require('./db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Routes
app.use('/auth', require('./routes/auth'));
app.use('/reports', require('./routes/reports'));
app.use('/admin', require('./routes/admin'));
app.use('/api/stats', require('./routes/stats'));

// temporary manual seed route
const { query } = require('./db');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

app.get('/manual-seed-admin-fix', async (req, res) => {
    const email = 'admin@example.com';
    const password = 'admin';
    const name = 'Master Admin';

    try {
        const result = await query('SELECT * FROM users WHERE email = ?', [email]);
        if (result.rows.length > 0) {
            return res.send('Admin already exists');
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const id = uuidv4();

        await query('INSERT INTO users (id, name, email, password_hash, role, trust_score) VALUES (?, ?, ?, ?, ?, ?)',
            [id, name, email, hashedPassword, 'ADMIN', 100]);

        res.send(`Admin created: ${email} / ${password}`);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error seeding admin: ' + err.message);
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// Initialize Database and Start Server
initDb().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}).catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
});
