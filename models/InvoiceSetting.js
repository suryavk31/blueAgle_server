const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const InvoiceSetting = sequelize.define('InvoiceSetting', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    companyName: {
        type: DataTypes.STRING,
        defaultValue: 'BlueAgle Commerce Pvt Ltd',
    },
    companyLogo: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    gstNumber: {
        type: DataTypes.STRING,
        defaultValue: '29ABCDE1234F1ZH',
    },
    vatNumber: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    businessRegistration: {
        type: DataTypes.STRING,
        defaultValue: 'U72900KA2026PTC123456',
    },
    address: {
        type: DataTypes.TEXT,
        defaultValue: '4th Floor, Tech Park Tower, Koramangala, Bengaluru, Karnataka 560095',
    },
    phone: {
        type: DataTypes.STRING,
        defaultValue: '+91 1800-123-4567',
    },
    email: {
        type: DataTypes.STRING,
        defaultValue: 'billing@blueeagle.com',
    },
    website: {
        type: DataTypes.STRING,
        defaultValue: 'https://blueeagle.com',
    },
    defaultCurrency: {
        type: DataTypes.STRING,
        defaultValue: 'INR',
    },
    currencySymbol: {
        type: DataTypes.STRING,
        defaultValue: '₹',
    },
    decimalPrecision: {
        type: DataTypes.INTEGER,
        defaultValue: 2,
    },
    dateFormat: {
        type: DataTypes.STRING,
        defaultValue: 'DD/MM/YYYY',
    },
    timeFormat: {
        type: DataTypes.STRING,
        defaultValue: 'hh:mm A',
    },
    digitalSignature: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    companyStamp: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    footerNotes: {
        type: DataTypes.TEXT,
        defaultValue: 'Thank you for shopping with BlueAgle! For queries, contact billing@blueeagle.com.',
    },
}, {
    timestamps: true,
});

module.exports = InvoiceSetting;
