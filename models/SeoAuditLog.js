const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SeoAuditLog = sequelize.define('SeoAuditLog', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    pageKey: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    action: {
        type: DataTypes.STRING,
        allowNull: false, // CREATE, UPDATE, DELETE, BULK_UPDATE, BULK_DELETE, IMPORT
    },
    performedBy: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    changes: {
        type: DataTypes.JSON,
        allowNull: true,
    },
}, {
    timestamps: true,
    tableName: 'seo_audit_logs'
});

module.exports = SeoAuditLog;
