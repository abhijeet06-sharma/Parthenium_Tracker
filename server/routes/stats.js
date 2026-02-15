const express = require('express');
const router = express.Router();
const { query } = require('../db');

// Get Public Stats
router.get('/public', async (req, res) => {
    try {
        // Total Reports
        const reportsRes = await query('SELECT COUNT(*) as count FROM reports');
        const reportsCount = reportsRes.rows[0].count;

        // "Communities" (Unique locations approx, or just random logic for now based on reports)
        // Let's count unique users as a proxy for community engagement
        const usersRes = await query("SELECT COUNT(*) as count FROM users WHERE role = 'USER'");
        const usersCount = usersRes.rows[0].count;

        // Resolved/Removed
        const resolvedRes = await query("SELECT COUNT(*) as count FROM reports WHERE status = 'RESOLVED'");
        const resolvedCount = resolvedRes.rows[0].count;

        // Leaderboard
        const leaderboardRes = await query(`
            SELECT users.name, COUNT(reports.id) as report_count 
            FROM users 
            JOIN reports ON users.id = reports.user_id 
            GROUP BY users.id 
            ORDER BY report_count DESC 
            LIMIT 3
        `);
        const leaderboard = leaderboardRes.rows;

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
