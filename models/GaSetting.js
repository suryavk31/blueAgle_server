const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const GaSetting = sequelize.define('GaSetting', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    propertyId: {
        type: DataTypes.STRING(100),
        allowNull: true,
    },
    measurementId: {
        type: DataTypes.STRING(100),
        allowNull: true,
    },
    serviceAccountEmail: {
        type: DataTypes.STRING(255),
        allowNull: true,
    },
    privateKey: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    isEnabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },
    connectionStatus: {
        type: DataTypes.STRING(50),
        defaultValue: 'Disconnected',
    },
    lastTestedAt: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    lastError: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
}, {
    tableName: 'ga_settings',
    timestamps: true,
});

module.exports = GaSetting;
