const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const DeliverySetting = sequelize.define('DeliverySetting', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    standardDeliveryCharge: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 49.00,
        allowNull: false,
    },
    expressDeliveryCharge: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 99.00,
        allowNull: false,
    },
    freeDeliveryThreshold: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 999.00,
        allowNull: false,
    },
    freeDeliveryEnabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false,
    },
    expressDeliveryEnabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false,
    },
    standardDeliveryEnabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false,
    },
    currencySymbol: {
        type: DataTypes.STRING,
        defaultValue: '₹',
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },
}, {
    tableName: 'deliverysettings',
    timestamps: true,
});

module.exports = DeliverySetting;
