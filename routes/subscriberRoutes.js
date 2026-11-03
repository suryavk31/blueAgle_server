const express = require('express');
const router = express.Router();
const { addSubscriber, getAllSubscribers, deleteSubscriber } = require('../controllers/subscriberController');
const { verifyAdminToken } = require('../middleware/adminAuthMiddleware');

// Public route to subscribe
router.post('/', addSubscriber);

// Admin routes to view & manage subscribers
router.get('/admin', verifyAdminToken, getAllSubscribers);
router.delete('/admin/:id', verifyAdminToken, deleteSubscriber);

module.exports = router;
