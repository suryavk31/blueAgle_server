const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ProductAttribute = sequelize.define('ProductAttribute', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    slug: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    type: {
        type: DataTypes.ENUM('text', 'number', 'select', 'multiselect', 'color', 'date', 'checkbox'),
        defaultValue: 'text',
    },
    options: {
        type: DataTypes.JSON, // Preset options array e.g. ["250g", "500g", "1kg"]
        allowNull: true,
    },
    isRequired: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    sortOrder: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
}, {
    tableName: 'product_attributes',
    timestamps: true,
});

module.exports = ProductAttribute;
