const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AdAnalytics = sequelize.define('AdAnalytics', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    adId: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    type: {
        type: DataTypes.ENUM('impression', 'click', 'conversion'),
        allowNull: false,
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    timestamp: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    },
}, {
    tableName: 'adanalytics',
    timestamps: true,
});

module.exports = AdAnalytics;
