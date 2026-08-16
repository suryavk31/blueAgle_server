const { ActivityLog } = require('../models');

/**
 * Log an admin action to the activity_logs table.
 *
 * @param {object} params
 * @param {number|null} params.adminUserId
 * @param {string} params.module - e.g. "Products"
 * @param {string} params.action - e.g. "Create", "Update", "Delete", "Login"
 * @param {string} [params.description] - Human-readable description
 * @param {string|number|null} [params.targetId]
 * @param {object|null} [params.oldValues]
 * @param {object|null} [params.newValues]
 * @param {import('express').Request} [params.req] - Express request for IP/UA extraction
 */
const logActivity = async ({
    adminUserId = null,
    module,
    action,
    description = null,
    targetId = null,
    oldValues = null,
    newValues = null,
    req = null,
}) => {
    try {
        const ipAddress = req
            ? (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null)
            : null;
        const userAgent = req ? (req.headers['user-agent'] || null) : null;

        await ActivityLog.create({
            adminUserId,
            module,
            action,
            description,
            targetId: targetId ? String(targetId) : null,
            oldValues,
            newValues,
            ipAddress,
            userAgent,
        });
    } catch (err) {
        // Never throw — logging failure should not break the main flow
        console.error('[ActivityLogger] Failed to write activity log:', err.message);
    }
};

module.exports = { logActivity };
