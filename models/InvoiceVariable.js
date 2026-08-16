const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const InvoiceVariable = sequelize.define('InvoiceVariable', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    variableName: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    placeholder: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    description: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    category: {
        type: DataTypes.STRING, // 'Company', 'Customer', 'Invoice', 'Order', 'Product'
        defaultValue: 'General',
    },
}, {
    tableName: 'invoicevariables',
    timestamps: true,
});

module.exports = InvoiceVariable;
