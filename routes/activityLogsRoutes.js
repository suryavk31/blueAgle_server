const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/activityLogsController');
const { verifyAdminToken, requirePermission } = require('../middleware/adminAuthMiddleware');

router.use(verifyAdminToken);

router.get('/', requirePermission('ActivityLogs', 'View'), ctrl.listActivityLogs);
router.get('/stats', requirePermission('ActivityLogs', 'View'), ctrl.getActivityStats);
router.get('/export', requirePermission('ActivityLogs', 'Export'), ctrl.exportActivityLogs);

module.exports = router;
