const express = require('express');
const router = express.Router();
const { db } = require('../db');

// Get Public Stats
router.get('/public', (req, res) => {
    try {
        // Total Reports
        const reportsCount = db.prepare('SELECT COUNT(*) as count FROM reports').get().count;

        // "Communities" (Unique locations approx, or just random logic for now based on reports)
        // Let's count unique users as a proxy for community engagement
        const usersCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'USER'").get().count;

        // Resolved/Removed
        const resolvedCount = db.prepare("SELECT COUNT(*) as count FROM reports WHERE status = 'RESOLVED'").get().count;

        // Leaderboard
        const leaderboard = db.prepare(`
            SELECT users.name, COUNT(reports.id) as report_count 
            FROM users 
            JOIN reports ON users.id = reports.user_id 
            GROUP BY users.id 
            ORDER BY report_count DESC 
            LIMIT 3
        `).all();

        res.json({
            reports: reportsCount,
            communities: usersCount, // Using users as proxy
            removed: resolvedCount,
            leaderboard
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

module.exports = router;
