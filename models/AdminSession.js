const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AdminSession = sequelize.define('AdminSession', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    adminUserId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'admin_users', key: 'id' },
    },
    device: {
        type: DataTypes.STRING(200),
        allowNull: true,
    },
    browser: {
        type: DataTypes.STRING(200),
        allowNull: true,
    },
    ipAddress: {
        type: DataTypes.STRING(45),
        allowNull: true,
    },
    loginTime: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    },
    logoutTime: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    refreshToken: {
        type: DataTypes.STRING(500),
        allowNull: true,
    },
    status: {
        type: DataTypes.ENUM('Active', 'Expired', 'LoggedOut'),
        defaultValue: 'Active',
    },
}, {
    tableName: 'admin_sessions',
    timestamps: true,
});

module.exports = AdminSession;
