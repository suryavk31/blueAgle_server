const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PaymentSetting = sequelize.define('PaymentSetting', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    paymentGatewayFeePercentage: {
        type: DataTypes.DECIMAL(5, 2),
        defaultValue: 2.00,
        allowNull: false,
    },
    paymentGatewayFeeGstPercentage: {
        type: DataTypes.DECIMAL(5, 2),
        defaultValue: 18.00,
        allowNull: false,
    },
    tdsPercentage: {
        type: DataTypes.DECIMAL(5, 2),
        defaultValue: 1.00,
        allowNull: false,
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false,
    },
}, {
    tableName: 'payment_settings',
    timestamps: true,
});

module.exports = PaymentSetting;
