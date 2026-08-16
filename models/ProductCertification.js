const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ProductCertification = sequelize.define('ProductCertification', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    productId: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    certificateNumber: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    iconUrl: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    validUntil: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
}, {
    tableName: 'product_certifications',
    timestamps: true,
});

module.exports = ProductCertification;
