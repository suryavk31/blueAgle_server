const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Coupon = sequelize.define('Coupon', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    code: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    discountType: {
        type: DataTypes.ENUM('percentage', 'fixed'),
        defaultValue: 'fixed',
    },
    value: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
    },
    expiryDate: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: () => {
            const d = new Date();
            d.setFullYear(d.getFullYear() + 1);
            return d;
        }
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },
}, {
    tableName: 'coupons',
    timestamps: true,
});

module.exports = Coupon;
