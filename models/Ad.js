const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Ad = sequelize.define('Ad', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    type: {
        type: DataTypes.ENUM('banner', 'card'), // 'banner' for top carousel, 'card' for category grids
        defaultValue: 'banner',
    },
    mediaType: {
        type: DataTypes.ENUM('image', 'video'),
        defaultValue: 'image',
    },
    mediaUrl: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    redirectUrl: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    location: {
        type: DataTypes.STRING, // e.g., 'home-top', 'home-middle', 'category-list'
        defaultValue: 'home-top',
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },
    // Aggregate stats for quick access
    impressions: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
    clicks: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
    conversions: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
}, {
    timestamps: true,
});

module.exports = Ad;
