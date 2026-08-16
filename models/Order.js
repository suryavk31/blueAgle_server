const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Order = sequelize.define('Order', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    subtotal: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0.00,
        allowNull: false,
    },
    deliveryCharge: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0.00,
        allowNull: false,
    },
    discountAmount: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0.00,
        allowNull: false,
    },
    taxAmount: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0.00,
        allowNull: false,
    },
    totalAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
    },
    deliveryMethod: {
        type: DataTypes.STRING,
        defaultValue: 'Standard',
    },
    status: {
        type: DataTypes.ENUM('Pending', 'Processing', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled', 'Returned'),
        defaultValue: 'Pending',
    },
    paymentStatus: {
        type: DataTypes.ENUM('Pending', 'Paid', 'Failed', 'Refunded'),
        defaultValue: 'Pending',
    },
    paymentId: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    address: {
        type: DataTypes.JSON, // Store address snapshots
        allowNull: false,
    },
    paymentMethod: {
        type: DataTypes.ENUM('COD', 'Online'),
        defaultValue: 'Online',
    },

    // ─── Financial Accounting Snapshots ───────────────────────────────────────
    paymentGatewayFeeRate: {
        type: DataTypes.DECIMAL(5, 2),
        defaultValue: 0.00,
        allowNull: false,
    },
    paymentGatewayFee: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0.00,
        allowNull: false,
    },
    paymentGatewayGstRate: {
        type: DataTypes.DECIMAL(5, 2),
        defaultValue: 0.00,
        allowNull: false,
    },
    paymentGatewayGst: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0.00,
        allowNull: false,
    },
    tdsRate: {
        type: DataTypes.DECIMAL(5, 2),
        defaultValue: 0.00,
        allowNull: false,
    },
    tdsAmount: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0.00,
        allowNull: false,
    },
    productCogs: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0.00,
        allowNull: false,
    },
    totalBusinessDeductions: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0.00,
        allowNull: false,
    },
    netProfit: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0.00,
        allowNull: false,
    },
}, {
    tableName: 'orders',
    timestamps: true,
});

module.exports = Order;
