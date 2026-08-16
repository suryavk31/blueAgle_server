const express = require('express');
const router = express.Router();
const {
    getCart, addToCart, updateCartItem, removeFromCart
} = require('../controllers/cartController');
const { verifyToken } = require('../middleware/authMiddleware');

router.get('/', verifyToken, getCart);
router.post('/', verifyToken, addToCart);
router.put('/:id', verifyToken, updateCartItem);
router.delete('/:id', verifyToken, removeFromCart);

module.exports = router;
