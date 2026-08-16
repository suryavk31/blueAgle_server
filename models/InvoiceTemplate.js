const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const InvoiceTemplate = sequelize.define('InvoiceTemplate', {
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
        allowNull: false,
        unique: true,
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    documentType: {
        type: DataTypes.ENUM(
            'Invoice',
            'Proforma Invoice',
            'Quotation',
            'Estimate',
            'Purchase Order',
            'Delivery Challan',
            'Credit Note',
            'Debit Note',
            'Receipt',
            'Packing Slip',
            'Sales Order',
            'Custom Document'
        ),
        defaultValue: 'Invoice',
    },
    canvasJson: {
        type: DataTypes.JSON, // Visual canvas tree (elements array, page size, orientation, grid)
        allowNull: false,
    },
    htmlTemplate: {
        type: DataTypes.TEXT('long'), // Compiled HTML cache
        allowNull: true,
    },
    cssTemplate: {
        type: DataTypes.TEXT, // Custom CSS overrides
        allowNull: true,
    },
    paperSize: {
        type: DataTypes.ENUM('A4', 'Letter', 'Legal', 'Custom'),
        defaultValue: 'A4',
    },
    orientation: {
        type: DataTypes.ENUM('Portrait', 'Landscape'),
        defaultValue: 'Portrait',
    },
    margins: {
        type: DataTypes.JSON, // { top: 15, right: 15, bottom: 15, left: 15 }
        defaultValue: { top: 15, right: 15, bottom: 15, left: 15 },
    },
    isDefault: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },
    version: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
    },
    categoryId: {
        type: DataTypes.INTEGER,
        allowNull: true,
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
    tableName: 'invoicetemplates',
    timestamps: true,
});

module.exports = InvoiceTemplate;
