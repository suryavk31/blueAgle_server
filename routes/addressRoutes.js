const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const { getAddresses, createAddress, updateAddress, deleteAddress } = require('../controllers/addressController');

router.get('/', verifyToken, getAddresses);
router.post('/', verifyToken, createAddress);
router.put('/:id', verifyToken, updateAddress);
router.delete('/:id', verifyToken, deleteAddress);

module.exports = router;
