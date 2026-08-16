const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/permissionsController');
const { verifyAdminToken, requirePermission } = require('../middleware/adminAuthMiddleware');

router.use(verifyAdminToken);

router.get('/', requirePermission('Roles', 'View'), ctrl.listPermissions);
router.get('/grouped', requirePermission('Roles', 'View'), ctrl.listPermissionsGrouped);
router.get('/export', requirePermission('Roles', 'Export'), ctrl.exportPermissions);

module.exports = router;
