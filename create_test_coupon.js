const { Coupon } = require('./models');

const createCoupon = async () => {
    try {
        await Coupon.create({
            code: 'SAVE10',
            discountType: 'percentage',
            value: 10,
            expiryDate: new Date('2030-01-01'),
            isActive: true
        });
        console.log('Test coupon SAVE10 created');
        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

createCoupon();
