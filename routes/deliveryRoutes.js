const express = require('express');
const router = express.Router();
const deliveryController = require('../controllers/deliveryController');
const { verifyAdminToken } = require('../middleware/adminAuthMiddleware');

// Public / User Routes
router.get('/settings', deliveryController.getDeliverySettings);
router.post('/calculate', deliveryController.calculateCheckoutPricing);

// Admin Routes
router.put('/admin/settings', verifyAdminToken, deliveryController.updateDeliverySettings);

module.exports = router;
