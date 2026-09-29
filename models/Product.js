const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Helpers for safe JSON serialization/deserialization for LONGTEXT columns
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

const parseObject = (value) => {
    if (!value) return {};
    if (typeof value === 'object' && !Array.isArray(value)) return value;
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) return {};
        try {
            let parsed = JSON.parse(trimmed);
            if (typeof parsed === 'string') {
                try { parsed = JSON.parse(parsed); } catch { return {}; }
            }
            return (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) ? parsed : {};
        } catch {
            return {};
        }
    }
    return {};
};

const serializeArray = (value) => JSON.stringify(parseArray(value));
const serializeObject = (value) => JSON.stringify(parseObject(value));

const jsonArrayField = (fieldName) => ({
    type: DataTypes.TEXT('long'),
    allowNull: true,
    get() {
        return parseArray(this.getDataValue(fieldName));
    },
    set(value) {
        this.setDataValue(fieldName, serializeArray(value));
    },
});

const jsonObjectField = (fieldName) => ({
    type: DataTypes.TEXT('long'),
    allowNull: true,
    get() {
        return parseObject(this.getDataValue(fieldName));
    },
    set(value) {
        this.setDataValue(fieldName, serializeObject(value));
    },
});

const Product = sequelize.define('Product', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    slug: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    shortName: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    sku: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    barcode: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    brand: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    shortDescription: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
    },

    // ─── Pricing & Tax ────────────────────────────────────────────────────────
    price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
    },
    mrp: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
    },
    costPrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
    },
    offerPercentage: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
    },
    gstPercentage: {
        type: DataTypes.DECIMAL(5, 2),
        defaultValue: 0,
    },
    taxStatus: {
        type: DataTypes.ENUM('Taxable', 'Exempt', 'Zero-Rated'),
        defaultValue: 'Taxable',
    },

    // ─── Inventory ────────────────────────────────────────────────────────────
    weight: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    stock: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
    lowStockAlert: {
        type: DataTypes.INTEGER,
        defaultValue: 5,
    },
    minOrderQuantity: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
    },
    maxOrderQuantity: {
        type: DataTypes.INTEGER,
        defaultValue: 10,
    },
    trackInventory: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },
    stockStatus: {
        type: DataTypes.ENUM('In Stock', 'Out of Stock', 'Pre-Order', 'Backorder'),
        defaultValue: 'In Stock',
    },
    warehouseLocation: {
        type: DataTypes.STRING,
        allowNull: true,
    },

    // ─── Media ────────────────────────────────────────────────────────────────
    images: jsonArrayField('images'),
    videoUrl: {
        type: DataTypes.STRING,
        allowNull: true,
    },

    // ─── Flags & Status ───────────────────────────────────────────────────────
    isFeatured: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    isNewArrival: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    isBestSeller: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    isRecommended: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    isTrending: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    status: {
        type: DataTypes.ENUM('Draft', 'Published', 'Archived'),
        defaultValue: 'Published',
    },
    visibility: {
        type: DataTypes.ENUM('Public', 'Hidden'),
        defaultValue: 'Public',
    },

    // ─── Ratings & Social Proof ───────────────────────────────────────────────
    rating: {
        type: DataTypes.DECIMAL(3, 2),
        defaultValue: 0,
    },
    reviewCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
    viewCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },

    // ─── Repeatable Content Arrays ────────────────────────────────────────────
    tags: jsonArrayField('tags'),
    ingredients: jsonArrayField('ingredients'),
    benefits: jsonArrayField('benefits'),
    usageInstructions: jsonArrayField('usageInstructions'),

    // ─── Delivery & Policy Settings ───────────────────────────────────────────
    deliveryTime: {
        type: DataTypes.STRING, // e.g. "10 Min Delivery", "2-3 Business Days"
        allowNull: true,
    },
    shippingMethod: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    codAvailable: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },
    expressDelivery: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    returnEligible: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },
    replacementEligible: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },

    // ─── SEO Metadata ─────────────────────────────────────────────────────────
    metaTitle: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    metaDescription: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    metaKeywords: {
        type: DataTypes.STRING,
        allowNull: true,
    },

    // ─── Custom Attributes ────────────────────────────────────────────────────
    customAttributes: jsonObjectField('customAttributes'),
}, {
    tableName: 'products',
    timestamps: true,
});

module.exports = Product;
