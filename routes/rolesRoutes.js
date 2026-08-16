const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/rolesController');
const { verifyAdminToken, requirePermission } = require('../middleware/adminAuthMiddleware');

router.use(verifyAdminToken);

router.get('/', requirePermission('Roles', 'View'), ctrl.listRoles);
router.get('/:id', requirePermission('Roles', 'View'), ctrl.getRole);
router.post('/', requirePermission('Roles', 'Create'), ctrl.createRole);
router.put('/:id', requirePermission('Roles', 'Update'), ctrl.updateRole);
router.delete('/:id', requirePermission('Roles', 'Delete'), ctrl.deleteRole);
router.post('/:id/duplicate', requirePermission('Roles', 'Create'), ctrl.duplicateRole);
router.put('/:id/permissions', requirePermission('Roles', 'Manage'), ctrl.updateRolePermissions);

module.exports = router;
