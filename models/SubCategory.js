const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SubCategory = sequelize.define('SubCategory', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    image: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    // categoryId will be added via associations
}, {
    timestamps: true,
});

module.exports = SubCategory;
