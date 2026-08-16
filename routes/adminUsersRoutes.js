const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/adminUsersController');
const { verifyAdminToken, requirePermission } = require('../middleware/adminAuthMiddleware');

router.use(verifyAdminToken);

router.get('/', requirePermission('AdminUsers', 'View'), ctrl.listAdminUsers);
router.get('/:id', requirePermission('AdminUsers', 'View'), ctrl.getAdminUser);
router.post('/', requirePermission('AdminUsers', 'Create'), ctrl.createAdminUser);
router.put('/:id', requirePermission('AdminUsers', 'Update'), ctrl.updateAdminUser);
router.delete('/:id', requirePermission('AdminUsers', 'Delete'), ctrl.deleteAdminUser);
router.post('/:id/reset-password', requirePermission('AdminUsers', 'Update'), ctrl.resetAdminPassword);
router.get('/:id/sessions', requirePermission('AdminUsers', 'View'), ctrl.getAdminSessions);
router.delete('/sessions/:sessionId', requirePermission('AdminUsers', 'Manage'), ctrl.terminateSession);

module.exports = router;
