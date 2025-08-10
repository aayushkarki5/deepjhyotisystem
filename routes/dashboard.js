// ===== routes/dashboard.js =====
const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { protect } = require('../middleware/auth');

// Dashboard data (protected)
router.get('/', protect, dashboardController.getDashboardData);

module.exports = router;
