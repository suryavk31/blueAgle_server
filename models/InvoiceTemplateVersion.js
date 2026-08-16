const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const InvoiceTemplateVersion = sequelize.define('InvoiceTemplateVersion', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    templateId: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    version: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    canvasJson: {
        type: DataTypes.JSON,
        allowNull: false,
    },
    changeSummary: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    createdBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
}, {
    tableName: 'invoicetemplateversions',
    timestamps: true,
});

module.exports = InvoiceTemplateVersion;
