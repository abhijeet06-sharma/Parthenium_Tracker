const express = require('express');
const router = express.Router();
const { db } = require('../db');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

// Admin Middleware
const adminAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token provided' });

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

// Update Report Status
router.put('/reports/:id/:action', adminAuth, (req, res) => {
    const { id, action } = req.params; // action: verify, reject, resolve
    const { notes } = req.body;

    const statusMap = {
        'verify': 'VERIFIED',
        'reject': 'REJECTED',
        'resolve': 'RESOLVED'
    };

    const newStatus = statusMap[action];
    if (!newStatus) return res.status(400).json({ error: 'Invalid action' });

    try {
        const updateStmt = db.prepare('UPDATE reports SET status = ?, admin_notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
        const info = updateStmt.run(newStatus, notes, id);

        if (info.changes === 0) return res.status(404).json({ error: 'Report not found' });

        // Log action
        const logId = uuidv4();
        const logStmt = db.prepare('INSERT INTO action_logs (id, report_id, admin_id, action) VALUES (?, ?, ?, ?)');
        logStmt.run(logId, id, req.user.id, newStatus);

        res.json({ message: `Report ${action}ed successfully` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Get Action Logs
router.get('/logs', adminAuth, (req, res) => {
    try {
        const stmt = db.prepare(`
            SELECT logs.id, logs.action, logs.timestamp, users.name as admin_name, reports.address 
            FROM action_logs as logs
            JOIN users ON logs.admin_id = users.id
            JOIN reports ON logs.report_id = reports.id
            ORDER BY logs.timestamp DESC
            LIMIT 10
        `);
        const logs = stmt.all();
        res.json(logs);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Get All Users
router.get('/users', adminAuth, (req, res) => {
    try {
        const stmt = db.prepare('SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC');
        const users = stmt.all();
        res.json(users);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Delete User
router.delete('/users/:id', adminAuth, (req, res) => {
    try {
        const stmt = db.prepare('DELETE FROM users WHERE id = ?');
        const info = stmt.run(req.params.id);
        if (info.changes === 0) return res.status(404).json({ error: 'User not found' });
        res.json({ message: 'User deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Get Single Report Details
router.get('/report/:id', adminAuth, (req, res) => {
    try {
        const stmt = db.prepare(`
            SELECT reports.*, users.name as user_name, users.email as user_email
            FROM reports
            LEFT JOIN users ON reports.user_id = users.id
            WHERE reports.id = ?
        `);
        const report = stmt.get(req.params.id);

        if (!report) return res.status(404).json({ error: 'Report not found' });
        res.json(report);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

module.exports = router;
