const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/blogController');
const { verifyAdminToken, requirePermission } = require('../middleware/adminAuthMiddleware');

// Public Customer Routes
router.get('/', ctrl.getPublicBlogs);
router.get('/:slug', ctrl.getPublicBlogBySlug);

// Admin CMS / Blog Management Routes
router.get('/admin/all', verifyAdminToken, requirePermission('SEO', 'View'), ctrl.getAllBlogsAdmin);
router.get('/admin/:id', verifyAdminToken, requirePermission('SEO', 'View'), ctrl.getBlogByIdAdmin);
router.post('/admin', verifyAdminToken, requirePermission('SEO', 'Create'), ctrl.createBlogAdmin);
router.put('/admin/:id', verifyAdminToken, requirePermission('SEO', 'Update'), ctrl.updateBlogAdmin);
router.delete('/admin/:id', verifyAdminToken, requirePermission('SEO', 'Delete'), ctrl.deleteBlogAdmin);

module.exports = router;
