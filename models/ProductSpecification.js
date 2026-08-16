const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ProductSpecification = sequelize.define('ProductSpecification', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    productId: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    groupName: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: 'General Specifications',
    },
    specKey: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    specValue: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    sortOrder: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
}, {
    tableName: 'product_specifications',
    timestamps: true,
});

module.exports = ProductSpecification;
