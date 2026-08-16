const express = require('express');
const router = express.Router();
const {
    getDashboardStats,
    getSalesChart,
    getTopProducts,
    getCategoryDistribution
} = require('../controllers/analyticsController');
const { verifyAdminToken, requirePermission } = require('../middleware/adminAuthMiddleware');

const {
    getGaConfig,
    updateGaConfig,
    testGaConnection,
    getGaDashboardData
} = require('../controllers/gaAnalyticsController');

router.get('/stats', verifyAdminToken, requirePermission('Dashboard', 'View'), getDashboardStats);
router.get('/sales-chart', verifyAdminToken, requirePermission('Dashboard', 'View'), getSalesChart);
router.get('/top-products', verifyAdminToken, requirePermission('Dashboard', 'View'), getTopProducts);
router.get('/category-dist', verifyAdminToken, requirePermission('Dashboard', 'View'), getCategoryDistribution);

// ─── GA4 Google Analytics Routes ──────────────────────────────────────────────
router.get('/ga4/config', verifyAdminToken, requirePermission('Settings', 'View'), getGaConfig);
router.post('/ga4/config', verifyAdminToken, requirePermission('Settings', 'Manage'), updateGaConfig);
router.post('/ga4/test-connection', verifyAdminToken, requirePermission('Settings', 'Manage'), testGaConnection);
router.get('/ga4/dashboard', verifyAdminToken, requirePermission('Reports', 'View'), getGaDashboardData);

module.exports = router;
