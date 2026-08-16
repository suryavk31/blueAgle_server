const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Role = sequelize.define('Role', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    isSystemRole: {
        // System roles cannot be deleted (e.g. Super Admin)
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
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
    tableName: 'roles',
    timestamps: true,
});

module.exports = Role;
