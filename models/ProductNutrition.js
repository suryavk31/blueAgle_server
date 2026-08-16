const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ProductNutrition = sequelize.define('ProductNutrition', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    productId: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    nutrient: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    amount: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    dailyValue: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    sortOrder: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
}, {
    tableName: 'product_nutrition',
    timestamps: true,
});

module.exports = ProductNutrition;
