const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PolicyVersion = sequelize.define('PolicyVersion', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    policyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    version: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    content: {
        type: DataTypes.TEXT('long'),
        allowNull: false,
    },
    contentJson: {
        type: DataTypes.JSON,
        allowNull: true,
    },
    changeSummary: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    createdBy: {
        type: DataTypes.INTEGER,
        allowNull: true, // AdminUser ID who published this version
    },
}, {
    timestamps: true,
});

module.exports = PolicyVersion;
