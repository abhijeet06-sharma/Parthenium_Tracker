const express = require('express');
const router = express.Router();
const { query } = require('../db');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

// Middleware to verify token
const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token provided' });

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

// File Upload Setup
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../../public/uploads/'));
    },
    filename: (req, file, cb) => {
        cb(null, uuidv4() + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

// Create Report
router.post('/', authenticate, upload.single('image'), async (req, res) => {
    const { latitude, longitude, address, severity } = req.body;
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;
    const reportId = uuidv4();

    try {
        await query(`
            INSERT INTO reports (id, user_id, latitude, longitude, address, severity, image_url, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING')
        `, [reportId, req.user.id, latitude, longitude, address, severity, imageUrl]);

        res.status(201).json({ message: 'Report submitted successfully', reportId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Get User Reports
router.get('/my', authenticate, async (req, res) => {
    try {
        const result = await query('SELECT * FROM reports WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Get All Reports (Admin/Public read-only potentially, but restricting to auth for now)
router.get('/all', async (req, res) => {
    try {
        const result = await query('SELECT * FROM reports ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

module.exports = router;
