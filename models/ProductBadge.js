const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ProductBadge = sequelize.define('ProductBadge', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    productId: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    badgeText: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    color: {
        type: DataTypes.STRING,
        defaultValue: '#10b981',
    },
    icon: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    sortOrder: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
}, {
    tableName: 'product_badges',
    timestamps: true,
});

module.exports = ProductBadge;
