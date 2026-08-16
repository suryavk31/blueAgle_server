const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Blog = sequelize.define('Blog', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    slug: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    excerpt: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    content: {
        type: DataTypes.TEXT('long'),
        allowNull: false,
    },
    author: {
        type: DataTypes.STRING,
        defaultValue: 'BlueAgle Editorial Team',
    },
    category: {
        type: DataTypes.STRING,
        defaultValue: 'Cold Pressed Oils Guide',
    },
    tags: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
    },
    image: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    readTime: {
        type: DataTypes.STRING,
        defaultValue: '5 min read',
    },
    status: {
        type: DataTypes.ENUM('Draft', 'Published'),
        defaultValue: 'Published',
    },
    views: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
    metaTitle: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    metaDescription: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    metaKeywords: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    canonicalUrl: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    isIndexed: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },
    publishedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    },
}, {
    timestamps: true,
    tableName: 'blogs',
});

module.exports = Blog;
