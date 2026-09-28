require('../config/env');
const { sequelize, AdminFcmToken } = require('../models');

async function syncAdminFcmTokensTable() {
    try {
        await sequelize.authenticate();
        console.log('Database connected successfully.');

        // Sync only AdminFcmToken model without altering/dropping other tables
        await AdminFcmToken.sync({ alter: true });
        console.log('Table `admin_fcm_tokens` is synced and ready.');

        process.exit(0);
    } catch (error) {
        console.error('Error syncing `admin_fcm_tokens` table:', error);
        process.exit(1);
    }
}

syncAdminFcmTokensTable();
