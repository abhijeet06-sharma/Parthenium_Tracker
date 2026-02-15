const express = require('express');
const router = express.Router();
const { query } = require('../db');
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
router.put('/reports/:id/:action', adminAuth, async (req, res) => {
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
        const result = await query('UPDATE reports SET status = ?, admin_notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [newStatus, notes, id]);

        if (result.rowCount === 0) return res.status(404).json({ error: 'Report not found' });

        // Log action
        const logId = uuidv4();
        await query('INSERT INTO action_logs (id, report_id, admin_id, action) VALUES (?, ?, ?, ?)', [logId, id, req.user.id, newStatus]);

        res.json({ message: `Report ${action}ed successfully` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Get Action Logs
router.get('/logs', adminAuth, async (req, res) => {
    try {
        const result = await query(`
            SELECT logs.id, logs.action, logs.timestamp, users.name as admin_name, reports.address 
            FROM action_logs as logs
            JOIN users ON logs.admin_id = users.id
            JOIN reports ON logs.report_id = reports.id
            ORDER BY logs.timestamp DESC
            LIMIT 10
        `);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Get All Users
router.get('/users', adminAuth, async (req, res) => {
    try {
        const result = await query('SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Delete User
router.delete('/users/:id', adminAuth, async (req, res) => {
    try {
        const result = await query('DELETE FROM users WHERE id = ?', [req.params.id]);
        if (result.rowCount === 0) return res.status(404).json({ error: 'User not found' });
        res.json({ message: 'User deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Get Single Report Details
router.get('/report/:id', adminAuth, async (req, res) => {
    try {
        const result = await query(`
            SELECT reports.*, users.name as user_name, users.email as user_email
            FROM reports
            LEFT JOIN users ON reports.user_id = users.id
            WHERE reports.id = ?
        `, [req.params.id]);

        const report = result.rows[0];

        if (!report) return res.status(404).json({ error: 'Report not found' });
        res.json(report);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

module.exports = router;
