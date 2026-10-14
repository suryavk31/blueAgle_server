const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const parseArray = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) return [];
        try {
            let parsed = JSON.parse(trimmed);
            if (typeof parsed === 'string') {
                try { parsed = JSON.parse(parsed); } catch { return []; }
            }
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }
    return [];
};

const serializeArray = (value) => JSON.stringify(parseArray(value));

const HomeSection = sequelize.define('HomeSection', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    subtitle: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    filterType: {
        type: DataTypes.ENUM('all', 'category', 'custom', 'discount', 'new_arrival', 'best_seller', 'featured'),
        defaultValue: 'all',
    },
    categoryId: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    productIds: {
        type: DataTypes.TEXT('long'),
        allowNull: true,
        get() {
            return parseArray(this.getDataValue('productIds'));
        },
        set(value) {
            this.setDataValue('productIds', serializeArray(value));
        },
    },
    limit: {
        type: DataTypes.INTEGER,
        defaultValue: 10,
    },
    sortOrder: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
    colorClass: {
        type: DataTypes.STRING,
        defaultValue: 'text-gray-900',
    },
    seeAllLink: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },
}, {
    tableName: 'home_sections',
    timestamps: true,
});

module.exports = HomeSection;
