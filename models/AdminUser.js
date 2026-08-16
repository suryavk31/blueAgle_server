const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AdminUser = sequelize.define('AdminUser', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    firstName: {
        type: DataTypes.STRING(100),
        allowNull: false,
    },
    lastName: {
        type: DataTypes.STRING(100),
        allowNull: false,
    },
    email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        validate: { isEmail: true },
    },
    phone: {
        type: DataTypes.STRING(20),
        allowNull: true,
    },
    passwordHash: {
        type: DataTypes.STRING(255),
        allowNull: false,
    },
    avatar: {
        type: DataTypes.STRING(500),
        allowNull: true,
    },
    roleId: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    status: {
        type: DataTypes.ENUM('Active', 'Inactive', 'Suspended'),
        defaultValue: 'Active',
    },
    forcePasswordChange: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    lastLoginAt: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    lastLoginIp: {
        type: DataTypes.STRING(45),
        allowNull: true,
    },
    createdBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    updatedBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
}, {
    tableName: 'admin_users',
    timestamps: true,
});

module.exports = AdminUser;
