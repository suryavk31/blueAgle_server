const express = require('express');
const router = express.Router();
const {
    createProduct, getProducts, getProductById, updateProduct, deleteProduct, exportProductsCSV
} = require('../controllers/productController');
const { verifyAdminToken, requirePermission } = require('../middleware/adminAuthMiddleware');
const { verifyToken, isAdmin } = require('../middleware/authMiddleware'); // kept for customer-facing auth
const upload = require('../middleware/uploadMiddleware');

// Public routes
router.get('/', getProducts);
router.get('/:id', getProductById);

// Admin routes (RBAC protected)
router.get('/export/csv', verifyAdminToken, requirePermission('Products', 'Export'), exportProductsCSV);


// Admin routes (RBAC protected)
router.post('/', verifyAdminToken, requirePermission('Products', 'Create'), upload.array('images', 5), createProduct);
router.put('/:id', verifyAdminToken, requirePermission('Products', 'Update'), upload.array('images', 5), updateProduct);
router.delete('/:id', verifyAdminToken, requirePermission('Products', 'Delete'), deleteProduct);

module.exports = router;
