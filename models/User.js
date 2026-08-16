const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    phone: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    role: {
        type: DataTypes.ENUM('user', 'admin'),
        defaultValue: 'user',
    },
    name: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    email: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    status: {
        type: DataTypes.ENUM('Active', 'Deleted', 'Suspended'),
        defaultValue: 'Active',
    },
    deletedAt: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    deletionReason: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    deletionFeedback: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    anonymizedAt: {
        type: DataTypes.DATE,
        allowNull: true,
    },
}, {
    tableName: 'users',
    timestamps: true,
});

module.exports = User;
