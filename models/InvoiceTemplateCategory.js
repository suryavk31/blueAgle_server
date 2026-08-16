const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const InvoiceTemplateCategory = sequelize.define('InvoiceTemplateCategory', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    sortOrder: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
}, {
    tableName: 'invoicetemplatecategories',
    timestamps: true,
});

module.exports = InvoiceTemplateCategory;
