const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PERMISSION_TYPES = [
    'View', 'Create', 'Update', 'Delete',
    'Export', 'Import', 'Approve', 'Reject',
    'Publish', 'Unpublish', 'Manage'
];

const Permission = sequelize.define('Permission', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    moduleId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'modules', key: 'id' },
    },
    permissionKey: {
        // e.g. "Products.Create" — used for fast lookups
        type: DataTypes.STRING(200),
        allowNull: false,
        unique: true,
    },
    displayName: {
        // e.g. "Create Products"
        type: DataTypes.STRING(200),
        allowNull: false,
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
}, {
    tableName: 'permissions',
    timestamps: true,
});

Permission.TYPES = PERMISSION_TYPES;

module.exports = Permission;
