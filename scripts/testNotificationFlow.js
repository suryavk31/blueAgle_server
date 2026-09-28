require('../config/env');
const http = require('http');
const express = require('express');
const jwt = require('jsonwebtoken');
const { io: ClientIO } = require('../../client/node_modules/socket.io-client');
const { sequelize, AdminUser, AdminFcmToken } = require('../models');
const { initSocket } = require('../services/socketService');
const { notifyAdminNewOrder } = require('../services/notificationService');

async function runTests() {
    console.log('──────────────────────────────────────────────────────');
    console.log('🧪 Running Admin Notification Test Suite');
    console.log('──────────────────────────────────────────────────────');

    await sequelize.authenticate();
    console.log('✓ Database connected.');

    // 1. Create a dummy test HTTP server & Socket.IO
    const app = express();
    const server = http.createServer(app);
    initSocket(server, ['http://localhost:5173']);

    const TEST_PORT = 5055;
    await new Promise((resolve) => server.listen(TEST_PORT, resolve));
    console.log(`✓ Test Socket.IO server running on port ${TEST_PORT}`);

    // 2. Find or create a test admin user
    let adminUser = await AdminUser.findOne({ where: { email: 'admin_test_notif@example.com' } });
    if (!adminUser) {
        adminUser = await AdminUser.create({
            firstName: 'Test',
            lastName: 'Admin',
            email: 'admin_test_notif@example.com',
            passwordHash: 'dummyhash',
            status: 'Active',
        });
    }
    console.log(`✓ Test Admin User ID: ${adminUser.id}`);

    // 3. Test FCM token registration & update
    const testToken = `test_fcm_token_${Date.now()}`;
    const [tokenRec, created] = await AdminFcmToken.findOrCreate({
        where: { token: testToken },
        defaults: {
            adminUserId: adminUser.id,
            token: testToken,
            deviceInfo: 'Test Chrome Desktop',
            isActive: true,
        },
    });
    console.log(`✓ FCM token stored in DB (Created: ${created}, ID: ${tokenRec.id})`);

    // 4. Test Socket.IO Admin Connection
    const adminToken = jwt.sign(
        { id: adminUser.id, email: adminUser.email },
        process.env.ADMIN_JWT_SECRET,
        { expiresIn: '1h' }
    );

    const clientSocket = ClientIO(`http://localhost:${TEST_PORT}`, {
        auth: { token: adminToken },
        transports: ['websocket'],
    });

    const receivedEvents = [];

    await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Socket connection timed out')), 5000);

        clientSocket.on('connect', () => {
            console.log('✓ Admin socket successfully authenticated and connected!');
            clearTimeout(timeout);
            resolve();
        });

        clientSocket.on('connect_error', (err) => {
            clearTimeout(timeout);
            reject(err);
        });

        clientSocket.on('admin:new-order', (payload) => {
            console.log('✓ Received real-time in-app event `admin:new-order`:', payload);
            receivedEvents.push(payload);
        });
    });

    // 5. Test notifyAdminNewOrder dispatch
    console.log('✓ Triggering notifyAdminNewOrder dispatch...');
    await notifyAdminNewOrder({
        orderId: 99999,
        orderNumber: '#099999',
        customerName: 'Suresh Kumar',
        totalAmount: 1450,
        paymentMethod: 'COD',
    });

    // Wait a brief moment for socket transmission
    await new Promise((r) => setTimeout(r, 1000));

    if (receivedEvents.length === 1 && receivedEvents[0].orderNumber === '#099999') {
        console.log('✓ TEST PASSED: Socket.IO event received with exact order data!');
    } else {
        throw new Error('Socket.IO event not received as expected');
    }

    // 6. Test Non-Admin Rejection
    const nonAdminSocket = ClientIO(`http://localhost:${TEST_PORT}`, {
        auth: { token: 'invalid_token_123' },
        transports: ['websocket'],
    });

    const rejectionPassed = await new Promise((resolve) => {
        nonAdminSocket.on('connect_error', (err) => {
            console.log('✓ TEST PASSED: Unauthenticated socket connection properly rejected:', err.message);
            resolve(true);
        });
        nonAdminSocket.on('connect', () => {
            console.error('❌ Error: Unauthenticated socket should not have connected');
            resolve(false);
        });
    });

    if (!rejectionPassed) {
        throw new Error('Non-admin socket was not rejected');
    }

    // Clean up test records
    await AdminFcmToken.destroy({ where: { token: testToken } });
    await AdminUser.destroy({ where: { email: 'admin_test_notif@example.com' } });

    clientSocket.disconnect();
    nonAdminSocket.disconnect();
    server.close();

    console.log('──────────────────────────────────────────────────────');
    console.log('🎉 ALL NOTIFICATION TESTS PASSED SUCCESSFULLY!');
    console.log('──────────────────────────────────────────────────────');
    process.exit(0);
}

runTests().catch((err) => {
    console.error('❌ Test failed with error:', err);
    process.exit(1);
});
