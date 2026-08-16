const express = require('express');
const router = express.Router();
const {
    getCategories, createCategory, updateCategory, deleteCategory,
    createSubCategory, updateSubCategory, deleteSubCategory
} = require('../controllers/categoryController');
const { verifyAdminToken, requirePermission } = require('../middleware/adminAuthMiddleware');
const upload = require('../middleware/uploadMiddleware');

// ── Category routes ──────────────────────────────────────────────────────────
router.get('/', getCategories); // Public

router.post('/', verifyAdminToken, requirePermission('Categories', 'Create'), upload.single('image'), createCategory);

// ── Sub-category routes (MUST be before /:id routes to avoid conflicts) ──────
router.post('/sub', verifyAdminToken, requirePermission('Categories', 'Create'), upload.single('image'), createSubCategory);
router.put('/sub/:id', verifyAdminToken, requirePermission('Categories', 'Update'), upload.single('image'), updateSubCategory);
router.delete('/sub/:id', verifyAdminToken, requirePermission('Categories', 'Delete'), deleteSubCategory);

// ── Category :id routes ──────────────────────────────────────────────────────
router.put('/:id', verifyAdminToken, requirePermission('Categories', 'Update'), upload.single('image'), updateCategory);
router.delete('/:id', verifyAdminToken, requirePermission('Categories', 'Delete'), deleteCategory);

module.exports = router;
