require('../config/env');
const { sequelize } = require('../models');

async function updateIpColumns() {
    console.log('[Script] Starting IP column migration...');

    try {
        await sequelize.authenticate();
        console.log('[Database] Connected successfully.');

        const alterQueries = [
            {
                table: 'admin_sessions',
                column: 'ipAddress',
                sql: 'ALTER TABLE `admin_sessions` MODIFY COLUMN `ipAddress` VARCHAR(255) NULL;'
            },
            {
                table: 'admin_users',
                column: 'lastLoginIp',
                sql: 'ALTER TABLE `admin_users` MODIFY COLUMN `lastLoginIp` VARCHAR(255) NULL;'
            },
            {
                table: 'activity_logs',
                column: 'ipAddress',
                sql: 'ALTER TABLE `activity_logs` MODIFY COLUMN `ipAddress` VARCHAR(255) NULL;'
            }
        ];

        for (const query of alterQueries) {
            try {
                await sequelize.query(query.sql);
                console.log(`[Success] Updated ${query.table}.${query.column} -> VARCHAR(255)`);
            } catch (err) {
                // If table doesn't exist or column is already compatible, log warning without stopping
                console.warn(`[Warning] Could not alter ${query.table}.${query.column}:`, err.message);
            }
        }

        console.log('[Script] Migration completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('[Error] Migration failed:', error);
        process.exit(1);
    }
}

updateIpColumns();

