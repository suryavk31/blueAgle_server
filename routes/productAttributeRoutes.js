const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/productAttributeController');
const { verifyAdminToken, requirePermission } = require('../middleware/adminAuthMiddleware');

// Public — listing attributes is needed for product detail pages
router.get('/', ctrl.listAttributes);

// Admin-only mutations (RBAC protected)
router.post('/', verifyAdminToken, requirePermission('Products', 'Create'), ctrl.createAttribute);
router.put('/:id', verifyAdminToken, requirePermission('Products', 'Update'), ctrl.updateAttribute);
router.delete('/:id', verifyAdminToken, requirePermission('Products', 'Delete'), ctrl.deleteAttribute);

module.exports = router;
