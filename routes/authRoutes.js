const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const { loginOrRegister, getMe, adminLogin } = require('../controllers/authController');

router.post('/login', verifyToken, loginOrRegister);
router.post('/admin-login', adminLogin);
router.get('/me', verifyToken, getMe);

module.exports = router;

