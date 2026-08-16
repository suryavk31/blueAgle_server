const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

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
    images: {
        type: DataTypes.JSON, // Array of URLs
        allowNull: true,
    },
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
    tags: {
        type: DataTypes.JSON, // Array of strings e.g. ["Organic", "Oil", "ColdPressed"]
        allowNull: true,
    },
    ingredients: {
        type: DataTypes.JSON, // Array of strings
        allowNull: true,
    },
    benefits: {
        type: DataTypes.JSON, // Array of strings
        allowNull: true,
    },
    usageInstructions: {
        type: DataTypes.JSON, // Array of strings
        allowNull: true,
    },

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
    customAttributes: {
        type: DataTypes.JSON, // Key-value object
        allowNull: true,
    },
}, {
    tableName: 'products',
    timestamps: true,
});

module.exports = Product;
