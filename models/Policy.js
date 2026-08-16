const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Policy = sequelize.define('Policy', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    type: {
        type: DataTypes.STRING, // 'privacy', 'terms', 'refund', 'cancellation', 'shipping', 'return', 'account-deletion', 'cookie', 'contact', 'about', 'faq'
        allowNull: false,
        unique: true,
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    content: {
        type: DataTypes.TEXT('long'), // Standard HTML / Markdown content fallback
        allowNull: false,
    },
    contentJson: {
        type: DataTypes.JSON, // Structured JSON content (sections & blocks)
        allowNull: true,
    },
    status: {
        type: DataTypes.ENUM('Draft', 'Published', 'Unpublished'),
        defaultValue: 'Published',
    },
    version: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
    },
    lastUpdated: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    },
    scheduledPublishAt: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    seoTitle: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    seoDescription: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    seoKeywords: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    canonicalUrl: {
        type: DataTypes.STRING,
        allowNull: true,
    },
}, {
    tableName: 'policies',
    timestamps: true,
});

module.exports = Policy;
