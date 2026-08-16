const express = require('express');
const router = express.Router();
const {
    createCoupon, getCoupons, deleteCoupon, verifyCoupon
} = require('../controllers/couponController');
const { verifyToken } = require('../middleware/authMiddleware');
const { verifyAdminToken, requirePermission } = require('../middleware/adminAuthMiddleware');

// Admin routes (RBAC)
router.post('/', verifyAdminToken, requirePermission('Coupons', 'Create'), createCoupon);
router.get('/', verifyAdminToken, requirePermission('Coupons', 'View'), getCoupons);
router.delete('/:id', verifyAdminToken, requirePermission('Coupons', 'Delete'), deleteCoupon);

// Customer route
router.post('/verify', verifyToken, verifyCoupon);

module.exports = router;
