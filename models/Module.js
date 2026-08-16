const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Module = sequelize.define('Module', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    name: {
        // Internal identifier e.g. "Products"
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
    },
    displayName: {
        // Human-readable label shown in sidebar
        type: DataTypes.STRING(150),
        allowNull: false,
    },
    slug: {
        // URL-safe identifier e.g. "products"
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
    },
    parentModuleId: {
        // Self-referential FK for nested modules
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'modules', key: 'id' },
    },
    icon: {
        // React-icons name e.g. "FaBox"
        type: DataTypes.STRING(100),
        allowNull: true,
    },
    route: {
        // Frontend route e.g. "/admin/products"
        type: DataTypes.STRING(255),
        allowNull: true,
    },
    sortOrder: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    isVisible: {
        // Whether to show in sidebar
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },
}, {
    tableName: 'modules',
    timestamps: true,
});

module.exports = Module;
