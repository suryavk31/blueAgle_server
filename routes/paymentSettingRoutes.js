const express = require('express');
const router = express.Router();
const {
    getPaymentSettings,
    updatePaymentSettings,
} = require('../controllers/paymentSettingController');
const { verifyAdminToken, requirePermission } = require('../middleware/adminAuthMiddleware');

router.get('/', verifyAdminToken, requirePermission('Settings', 'View'), getPaymentSettings);
router.put('/', verifyAdminToken, requirePermission('Settings', 'Manage'), updatePaymentSettings);

module.exports = router;
