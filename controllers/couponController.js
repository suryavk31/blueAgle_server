const { Coupon } = require('../models');
const { Op } = require('sequelize');

const createCoupon = async (req, res) => {
    try {
        const { code, discountType, value, expiryDate, isActive } = req.body;
        const coupon = await Coupon.create({
            code, discountType, value, expiryDate, isActive
        });
        res.status(201).json(coupon);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getCoupons = async (req, res) => {
    try {
        const coupons = await Coupon.findAll();
        res.json(coupons);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const deleteCoupon = async (req, res) => {
    try {
        const { id } = req.params;
        await Coupon.destroy({ where: { id } });
        res.json({ message: 'Coupon deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const verifyCoupon = async (req, res) => {
    try {
        const { code } = req.body;
        if (!code) return res.status(400).json({ message: 'Coupon code is required' });

        const coupon = await Coupon.findOne({ 
            where: { 
                code: { [Op.like]: code } 
            } 
        });

        if (!coupon) return res.status(404).json({ message: 'Invalid coupon code' });
        if (!coupon.isActive) return res.status(400).json({ message: 'This coupon is no longer active' });
        if (coupon.expiryDate && new Date(coupon.expiryDate) < new Date()) {
            return res.status(400).json({ message: 'Coupon has expired' });
        }

        res.json(coupon);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createCoupon,
    getCoupons,
    deleteCoupon,
    verifyCoupon
};
