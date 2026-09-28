const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AdminFcmToken = sequelize.define('AdminFcmToken', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    adminUserId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'admin_users',
            key: 'id',
        },
        onDelete: 'CASCADE',
    },
    token: {
        type: DataTypes.STRING(500),
        allowNull: false,
        unique: true,
    },
    deviceInfo: {
        type: DataTypes.STRING(255),
        allowNull: true,
    },
    lastUsedAt: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },
}, {
    tableName: 'admin_fcm_tokens',
    timestamps: true,
    indexes: [
        { fields: ['adminUserId'] },
        { fields: ['token'], unique: true },
        { fields: ['isActive'] },
    ],
});

module.exports = AdminFcmToken;
