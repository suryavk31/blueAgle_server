const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ProductHighlight = sequelize.define('ProductHighlight', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    productId: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    icon: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: 'FaLeaf',
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    description: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    sortOrder: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
}, {
    tableName: 'product_highlights',
    timestamps: true,
});

module.exports = ProductHighlight;
