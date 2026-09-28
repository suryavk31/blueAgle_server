const { AdminFcmToken, AdminUser } = require('../models');
const { emitAdminNewOrder } = require('./socketService');
const firebaseAdmin = require('../config/firebaseAdmin');

/**
 * Dispatches both real-time Socket.IO and background FCM push notifications
 * to active admin users when a new order is successfully created and committed.
 *
 * @param {Object} orderData
 * @param {number|string} orderData.orderId
 * @param {string} [orderData.orderNumber]
 * @param {string} [orderData.customerName]
 * @param {number} orderData.totalAmount
 * @param {string} [orderData.paymentMethod]
 * @param {string} [orderData.createdAt]
 */
const notifyAdminNewOrder = async (orderData) => {
    try {
        const orderId = orderData.orderId || orderData.id;
        const orderNumber = orderData.orderNumber || (orderId ? `#${String(orderId).padStart(6, '0')}` : '#000000');
        const formattedAmount = Number(orderData.totalAmount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
        const customerName = orderData.customerName || 'Customer';

        const normalizedPayload = {
            orderId: orderId,
            orderNumber: orderNumber,
            customerName: customerName,
            totalAmount: Number(orderData.totalAmount || 0),
            paymentMethod: orderData.paymentMethod || 'Online',
            createdAt: orderData.createdAt || new Date().toISOString(),
        };

        // ── 1. Emit Real-time Socket.IO In-App Notification ────────────────
        emitAdminNewOrder(normalizedPayload);

        // ── 2. Dispatch Background FCM Push Notifications to Admin Tokens ──
        if (!firebaseAdmin.apps.length) {
            console.log('[NotificationService] Firebase Admin not initialized. Skipping FCM push.');
            return;
        }

        // Retrieve active tokens for active admins only
        const tokenRecords = await AdminFcmToken.findAll({
            where: { isActive: true },
            include: [{
                model: AdminUser,
                as: 'adminUser',
                where: { status: 'Active' },
                attributes: ['id', 'status'],
            }],
        });

        if (!tokenRecords || tokenRecords.length === 0) {
            console.log('[NotificationService] No active admin FCM tokens found.');
            return;
        }

        const registrationTokens = tokenRecords.map((t) => t.token);

        const message = {
            tokens: registrationTokens,
            notification: {
                title: 'New Order Received',
                body: `Order ${orderNumber} • ₹${formattedAmount}`,
            },
            data: {
                type: 'NEW_ORDER',
                orderId: String(orderId),
                orderNumber: String(orderNumber),
                totalAmount: String(normalizedPayload.totalAmount),
                url: '/admin/orders',
            },
            webpush: {
                fcmOptions: {
                    link: '/admin/orders',
                },
                notification: {
                    icon: '/logo.png',
                    badge: '/logo.png',
                    tag: `new-order-${orderId}`, // Deduplicates system tray notifications for the same order
                    renotify: true,
                },
            },
        };

        const response = await firebaseAdmin.messaging().sendEachForMulticast(message);
        console.log(`[NotificationService] FCM multicast sent: ${response.successCount} succeeded, ${response.failureCount} failed.`);

        // Handle invalid / expired tokens
        if (response.failureCount > 0) {
            const tokensToDeactivate = [];

            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    const errorCode = resp.error?.code;
                    console.warn(`[NotificationService] FCM delivery error for token [${registrationTokens[idx].slice(0, 12)}...]: ${errorCode} - ${resp.error?.message}`);

                    if (
                        errorCode === 'messaging/invalid-registration-token' ||
                        errorCode === 'messaging/registration-token-not-registered' ||
                        errorCode === 'messaging/mismatched-credential'
                    ) {
                        tokensToDeactivate.push(registrationTokens[idx]);
                    }
                }
            });

            if (tokensToDeactivate.length > 0) {
                await AdminFcmToken.update(
                    { isActive: false },
                    { where: { token: tokensToDeactivate } }
                );
                console.log(`[NotificationService] Deactivated ${tokensToDeactivate.length} invalid FCM tokens.`);
            }
        }

    } catch (error) {
        // Notification errors must NEVER fail or crash order creation
        console.error('[NotificationService] Error dispatching admin new order notifications:', error);
    }
};

module.exports = {
    notifyAdminNewOrder,
};
