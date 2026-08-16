const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Address = sequelize.define('Address', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    label: {
        type: DataTypes.ENUM('Home', 'Work', 'Hotel', 'Other'),
        defaultValue: 'Home',
    },
    flatNo: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    floor: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    area: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    landmark: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    contactName: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    contactPhone: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    isDefault: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
}, {
    tableName: 'addresses',
    timestamps: true,
});

module.exports = Address;
