const express = require('express');
const router = express.Router();
const {
    getPublicHomeSections,
    getAllSectionsAdmin,
    createSection,
    updateSection,
    toggleSectionStatus,
    reorderSections,
    deleteSection,
} = require('../controllers/homeSectionController');
const { verifyAdminToken } = require('../middleware/adminAuthMiddleware');

// ── Storefront Public Route ──────────────────────────────────────────────────
router.get('/', getPublicHomeSections);

// ── Admin Endpoints (when mounted at /api/admin/home-sections) ───────────────
router.get('/all', verifyAdminToken, getAllSectionsAdmin);
router.get('/admin', verifyAdminToken, getAllSectionsAdmin);
router.post('/admin', verifyAdminToken, createSection);
router.put('/admin/reorder', verifyAdminToken, reorderSections);
router.put('/admin/:id', verifyAdminToken, updateSection);
router.patch('/admin/:id/toggle', verifyAdminToken, toggleSectionStatus);
router.delete('/admin/:id', verifyAdminToken, deleteSection);

// Aliases when calling adminApi.get('/home-sections/all') or adminApi.post('/home-sections')
router.post('/', verifyAdminToken, createSection);
router.put('/reorder', verifyAdminToken, reorderSections);
router.put('/:id', verifyAdminToken, updateSection);
router.patch('/:id/toggle', verifyAdminToken, toggleSectionStatus);
router.delete('/:id', verifyAdminToken, deleteSection);

module.exports = router;
