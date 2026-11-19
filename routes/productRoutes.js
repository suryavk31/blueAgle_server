const express = require('express');
const router = express.Router();
const {
    createProduct, getProducts, getProductById, updateProduct, deleteProduct, exportProductsCSV,
    downloadProductTemplate, bulkImportProducts
} = require('../controllers/productController');
const { verifyAdminToken, requirePermission } = require('../middleware/adminAuthMiddleware');
const { verifyToken, isAdmin } = require('../middleware/authMiddleware'); // kept for customer-facing auth
const upload = require('../middleware/uploadMiddleware');
const { uploadExcel } = require('../middleware/uploadMiddleware');

// Public route - list products
router.get('/', getProducts);

// Admin bulk & export routes (MUST be defined before /:id)
router.get('/export/csv', verifyAdminToken, requirePermission('Products', 'Export'), exportProductsCSV);
router.get('/template/download', verifyAdminToken, requirePermission('Products', 'Create'), downloadProductTemplate);
router.post('/bulk-import', verifyAdminToken, requirePermission('Products', 'Create'), uploadExcel.single('file'), bulkImportProducts);

// Public route - get by id
router.get('/:id', getProductById);

// Admin CRUD routes
router.post('/', verifyAdminToken, requirePermission('Products', 'Create'), upload.array('images', 5), createProduct);
router.put('/:id', verifyAdminToken, requirePermission('Products', 'Update'), upload.array('images', 5), updateProduct);
router.delete('/:id', verifyAdminToken, requirePermission('Products', 'Delete'), deleteProduct);

module.exports = router;
