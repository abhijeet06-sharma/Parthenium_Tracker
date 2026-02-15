const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { initDb } = require('./db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure public/uploads exists
const uploadsDir = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('Created public/uploads directory');
}

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
app.use('/debug-cloudinary', async (req, res) => {
    const cloudinary = require('cloudinary').v2;
    if (!process.env.CLOUDINARY_CLOUD_NAME) {
        return res.json({ status: 'Local Mode', message: 'Cloudinary not configured' });
    }

    try {
        cloudinary.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET
        });

        const result = await cloudinary.api.ping();
        res.json({ status: 'Success', message: 'Connected to Cloudinary', result });
    } catch (err) {
        res.status(500).json({ status: 'Error', message: err.message, stack: err.stack });
    }
});
app.use((err, req, res, next) => {
    console.error('SERVER ERROR:', err); // Log full error
    // Send specific error message to client for debugging
    res.status(500).json({
        error: err.message || 'Something went wrong!',
        details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
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
