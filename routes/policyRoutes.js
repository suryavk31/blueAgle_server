const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/policyController');
const { verifyAdminToken, requirePermission } = require('../middleware/adminAuthMiddleware');

// Public routes (for customer website & footer)
router.get('/', ctrl.listPublicPolicies);
router.get('/:type', ctrl.getPolicyByType);

// Admin CMS routes (RBAC protected)
router.get('/admin/cms/:type', verifyAdminToken, requirePermission('Policies', 'View'), ctrl.getAdminPolicyByType);
router.post('/validate', verifyAdminToken, requirePermission('Policies', 'View'), ctrl.validatePolicyJson);
router.post('/:type', verifyAdminToken, requirePermission('Policies', 'Update'), ctrl.upsertPolicy);
router.post('/:type/restore/:versionId', verifyAdminToken, requirePermission('Policies', 'Update'), ctrl.restorePolicyVersion);

module.exports = router;
