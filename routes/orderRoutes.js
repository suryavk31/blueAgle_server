const express = require('express');
const router = express.Router();
const {
    createRazorpayOrder, verifyPaymentAndCreateOrder, createCODOrder, getMyOrders, getAllOrders, updateOrderStatus
} = require('../controllers/orderController');
const { verifyToken } = require('../middleware/authMiddleware');
const { verifyAdminToken, requirePermission } = require('../middleware/adminAuthMiddleware');

// Customer routes (Firebase auth)
router.post('/create-order', verifyToken, createRazorpayOrder);
router.post('/verify-payment', verifyToken, verifyPaymentAndCreateOrder);
router.post('/cod', verifyToken, createCODOrder);
router.get('/my-orders', verifyToken, getMyOrders);

// Admin routes (RBAC)
router.get('/all', verifyAdminToken, requirePermission('Orders', 'View'), getAllOrders);
router.put('/:id/status', verifyAdminToken, requirePermission('Orders', 'Update'), updateOrderStatus);

module.exports = router;
