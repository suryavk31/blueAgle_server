const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AdminInvitation = sequelize.define('AdminInvitation', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: { isEmail: true },
    },
    roleId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'roles', key: 'id' },
    },
    invitedBy: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'admin_users', key: 'id' },
    },
    invitationToken: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
    },
    message: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    expiresAt: {
        type: DataTypes.DATE,
        allowNull: false,
    },
    acceptedAt: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    status: {
        type: DataTypes.ENUM('Pending', 'Accepted', 'Expired', 'Cancelled'),
        defaultValue: 'Pending',
    },
}, {
    tableName: 'admin_invitations',
    timestamps: true,
});

module.exports = AdminInvitation;
