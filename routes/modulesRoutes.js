const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/modulesController');
const { verifyAdminToken, requirePermission } = require('../middleware/adminAuthMiddleware');

// Public route — used to build sidebar after login
router.get('/my-modules', verifyAdminToken, ctrl.getMyModules);

router.use(verifyAdminToken);

router.get('/flat', requirePermission('Modules', 'View'), ctrl.listModulesFlat);
router.get('/', requirePermission('Modules', 'View'), ctrl.listModules);
router.post('/', requirePermission('Modules', 'Create'), ctrl.createModule);
router.put('/:id', requirePermission('Modules', 'Update'), ctrl.updateModule);
router.delete('/:id', requirePermission('Modules', 'Delete'), ctrl.deleteModule);

module.exports = router;
