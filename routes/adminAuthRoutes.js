const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/adminAuthController');
const { verifyAdminToken } = require('../middleware/adminAuthMiddleware');

// Public routes
router.post('/login', ctrl.login);
router.post('/refresh', ctrl.refreshToken);
router.post('/forgot-password', ctrl.forgotPassword);
router.post('/reset-password', ctrl.resetPassword);

// Protected routes
router.get('/me', verifyAdminToken, ctrl.getMe);
router.post('/logout', verifyAdminToken, ctrl.logout);
router.post('/change-password', verifyAdminToken, ctrl.changePassword);

module.exports = router;
