const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ProductAttributeValue = sequelize.define('ProductAttributeValue', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    productId: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    attributeId: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    value: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
}, {
    tableName: 'product_attribute_values',
    timestamps: true,
});

module.exports = ProductAttributeValue;
