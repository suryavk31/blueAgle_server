const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ActivityLog = sequelize.define('ActivityLog', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    adminUserId: {
        type: DataTypes.INTEGER,
        allowNull: true, // null for system actions
        references: { model: 'admin_users', key: 'id' },
    },
    module: {
        // e.g. "Products", "Roles", "AdminUsers"
        type: DataTypes.STRING(100),
        allowNull: false,
    },
    action: {
        // e.g. "Login", "Create", "Update", "Delete", "PermissionChange"
        type: DataTypes.STRING(100),
        allowNull: false,
    },
    description: {
        // Human readable e.g. "Updated product 'Blue Eagle T-Shirt'"
        type: DataTypes.TEXT,
        allowNull: true,
    },
    targetId: {
        // ID of the affected record
        type: DataTypes.STRING(100),
        allowNull: true,
    },
    oldValues: {
        // JSON snapshot of record before change
        type: DataTypes.JSON,
        allowNull: true,
    },
    newValues: {
        // JSON snapshot of record after change
        type: DataTypes.JSON,
        allowNull: true,
    },
    ipAddress: {
        type: DataTypes.STRING(45),
        allowNull: true,
    },
    userAgent: {
        type: DataTypes.STRING(500),
        allowNull: true,
    },
}, {
    tableName: 'activity_logs',
    timestamps: true,
    updatedAt: false, // logs are immutable
});

module.exports = ActivityLog;
