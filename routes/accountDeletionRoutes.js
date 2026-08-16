const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/accountDeletionController');
const { verifyToken } = require('../middleware/authMiddleware');
const { verifyAdminToken, requirePermission } = require('../middleware/adminAuthMiddleware');

// Customer Route (Firebase Auth)
router.delete('/', verifyToken, ctrl.deleteAccount);
router.post('/delete', verifyToken, ctrl.deleteAccount);

// Admin Routes (RBAC)
router.get('/admin/deleted-accounts', verifyAdminToken, requirePermission('AdminUsers', 'View'), ctrl.listDeletedAccounts);
router.get('/admin/deleted-accounts/export', verifyAdminToken, requirePermission('AdminUsers', 'Export'), ctrl.exportDeletedAccounts);

module.exports = router;
