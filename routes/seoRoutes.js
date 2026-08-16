const express = require('express');
const router = express.Router();
const seoController = require('../controllers/seoController');
const seoSyncController = require('../controllers/seoSyncController');
const { verifyAdminToken, requirePermission } = require('../middleware/adminAuthMiddleware');

// ─── Public routes ────────────────────────────────────────────────────────────
router.get('/resolve', seoController.resolveSeoByRoute);
router.get('/global', seoController.getGlobalSeo);

// ─── Admin routes (RBAC) ──────────────────────────────────────────────────────
router.get('/all', verifyAdminToken, requirePermission('SEO', 'View'), seoController.getAllSeo);
router.put('/global', verifyAdminToken, requirePermission('SEO', 'Update'), seoController.updateGlobalSeo);
router.post('/validate', verifyAdminToken, requirePermission('SEO', 'View'), seoController.validateSeo);
router.post('/bulk', verifyAdminToken, requirePermission('SEO', 'Manage'), seoController.bulkActions);
router.get('/export', verifyAdminToken, requirePermission('SEO', 'Export'), seoController.exportSeo);
router.post('/import', verifyAdminToken, requirePermission('SEO', 'Import'), seoController.importSeo);

// ─── Auto SEO Sync routes ─────────────────────────────────────────────────────
router.get('/sync/stats', verifyAdminToken, requirePermission('SEO', 'View'), seoSyncController.getSyncStats);
router.get('/sync/missing', verifyAdminToken, requirePermission('SEO', 'View'), seoSyncController.getMissingPages);
router.get('/sync/preview', verifyAdminToken, requirePermission('SEO', 'View'), seoSyncController.previewSync);
router.post('/sync/generate', verifyAdminToken, requirePermission('SEO', 'Manage'), seoSyncController.generateMissingSeo);
router.post('/sync/regenerate', verifyAdminToken, requirePermission('SEO', 'Manage'), seoSyncController.regenerateSeo);
router.post('/sync/mark-manual/:id', verifyAdminToken, requirePermission('SEO', 'Update'), seoSyncController.markAsManual);
router.delete('/sync/mark-manual/:id', verifyAdminToken, requirePermission('SEO', 'Update'), seoSyncController.unmarkManual);

// ─── Individual record CRUD ───────────────────────────────────────────────────
router.get('/:id', verifyAdminToken, requirePermission('SEO', 'View'), seoController.getSeoById);
router.post('/', verifyAdminToken, requirePermission('SEO', 'Create'), seoController.createSeo);
router.put('/:id', verifyAdminToken, requirePermission('SEO', 'Update'), seoController.updateSeo);
router.delete('/:id', verifyAdminToken, requirePermission('SEO', 'Delete'), seoController.deleteSeo);

module.exports = router;
