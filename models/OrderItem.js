const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const OrderItem = sequelize.define('OrderItem', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
    },
    costPriceSnapshot: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0.00,
        allowNull: false,
    },
    quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
}, {
    tableName: 'orderitems',
    timestamps: true,
});

module.exports = OrderItem;
