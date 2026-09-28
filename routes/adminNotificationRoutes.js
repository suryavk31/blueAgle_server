const express = require('express');
const router = express.Router();
const { verifyAdminToken } = require('../middleware/adminAuthMiddleware');
const { AdminFcmToken } = require('../models');

// ── Register / Update FCM Device Token ──────────────────────────────────────
router.post('/fcm-token', verifyAdminToken, async (req, res) => {
    try {
        const { token, deviceInfo } = req.body;
        const adminUserId = req.adminUser?.id || req.admin?.id;

        if (!adminUserId) {
            return res.status(401).json({ message: 'Authenticated admin not found' });
        }

        if (!token || typeof token !== 'string') {
            return res.status(400).json({ message: 'Valid FCM token is required' });
        }

        const [record, created] = await AdminFcmToken.findOrCreate({
            where: { token },
            defaults: {
                adminUserId,
                token,
                deviceInfo: deviceInfo || null,
                isActive: true,
                lastUsedAt: new Date(),
            },
        });

        if (!created) {
            // Re-assign to current admin and activate
            record.adminUserId = adminUserId;
            record.deviceInfo = deviceInfo || record.deviceInfo;
            record.isActive = true;
            record.lastUsedAt = new Date();
            await record.save();
        }

        res.json({
            success: true,
            message: created ? 'FCM token registered successfully' : 'FCM token updated successfully',
        });
    } catch (error) {
        console.error('[Admin Notifications] Error saving FCM token:', error);
        res.status(500).json({ message: 'Failed to register notification token' });
    }
});

// ── Deactivate FCM Device Token on Logout ───────────────────────────────────
router.delete('/fcm-token', verifyAdminToken, async (req, res) => {
    try {
        const { token } = req.body;
        const adminUserId = req.adminUser?.id || req.admin?.id;

        if (!token) {
            return res.status(400).json({ message: 'Token is required' });
        }


        await AdminFcmToken.update(
            { isActive: false },
            {
                where: {
                    token,
                    adminUserId,
                },
            }
        );

        res.json({ success: true, message: 'FCM token deactivated' });
    } catch (error) {
        console.error('[Admin Notifications] Error deactivating FCM token:', error);
        res.status(500).json({ message: 'Failed to deactivate notification token' });
    }
});

module.exports = router;
