const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Invoice = sequelize.define('Invoice', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    orderId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
    },
    invoiceNumber: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    templateId: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    templateVersion: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
    },
    status: {
        type: DataTypes.ENUM('Generated', 'Cancelled', 'Regenerated'),
        defaultValue: 'Generated',
    },
    invoiceDate: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    },
    dueDate: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    subtotal: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0.00,
    },
    discountAmount: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0.00,
    },
    taxAmount: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0.00,
    },
    shippingAmount: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0.00,
    },
    totalAmount: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0.00,
    },
    currencySymbol: {
        type: DataTypes.STRING,
        defaultValue: '₹',
    },
    snapshotData: {
        type: DataTypes.JSON,
        allowNull: true,
    },
    generatedBy: {
        type: DataTypes.STRING,
        defaultValue: 'System',
    },
}, {
    timestamps: true,
});

module.exports = Invoice;
