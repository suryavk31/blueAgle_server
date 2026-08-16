const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const RolePermission = sequelize.define('RolePermission', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    roleId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'roles', key: 'id' },
    },
    permissionId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'permissions', key: 'id' },
    },
}, {
    tableName: 'role_permissions',
    timestamps: true,
    indexes: [
        {
            unique: true,
            fields: ['roleId', 'permissionId'],
        }
    ],
});

module.exports = RolePermission;
