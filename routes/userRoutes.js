const express = require('express');
const router = express.Router();
const { getAllUsers } = require('../controllers/userController');
const { verifyAdminToken, requirePermission } = require('../middleware/adminAuthMiddleware');

// Get all customer users (Admin access)
router.get('/', verifyAdminToken, requirePermission('Customers', 'View'), getAllUsers);

module.exports = router;

