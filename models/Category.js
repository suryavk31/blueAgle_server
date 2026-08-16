const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Category = sequelize.define('Category', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    image: {
        type: DataTypes.STRING,
        allowNull: true, // URL or path
    },
}, {
    tableName: 'categories',
    timestamps: true,
});

module.exports = Category;
