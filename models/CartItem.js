const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CartItem = sequelize.define('CartItem', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    quantity: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
    },
}, {
    tableName: 'cartitems',
    timestamps: true,
});

module.exports = CartItem;
