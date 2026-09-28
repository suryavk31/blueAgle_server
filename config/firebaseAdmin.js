const admin = require('firebase-admin');

if (!admin.apps.length) {
    let initialized = false;

    // Option 1: Full JSON Service Account in FIREBASE_SERVICE_ACCOUNT
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        try {
            let serviceAccount = typeof process.env.FIREBASE_SERVICE_ACCOUNT === 'string'
                ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
                : process.env.FIREBASE_SERVICE_ACCOUNT;

            if (serviceAccount && serviceAccount.private_key) {
                serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
            }

            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
            });
            initialized = true;
            console.log('[Firebase Admin] Initialized via FIREBASE_SERVICE_ACCOUNT');
        } catch (e) {
            console.error('[Firebase Admin] Failed to parse FIREBASE_SERVICE_ACCOUNT:', e.message);
        }
    }

    // Option 2: Individual variables
    if (!initialized && process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
        try {
            const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: process.env.FIREBASE_PROJECT_ID,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    privateKey: privateKey,
                }),
            });
            initialized = true;
            console.log('[Firebase Admin] Initialized via individual environment variables');
        } catch (e) {
            console.error('[Firebase Admin] Failed to initialize via individual variables:', e.message);
        }
    }

    // Option 3: Local serviceAccountKey.json fallback if available in dev
    if (!initialized && process.env.NODE_ENV !== 'production') {
        try {
            const path = require('path');
            const fs = require('fs');
            const keyPath = path.join(__dirname, '../serviceAccountKey.json');
            if (fs.existsSync(keyPath)) {
                const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
                if (serviceAccount.private_key) {
                    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
                }
                admin.initializeApp({
                    credential: admin.credential.cert(serviceAccount),
                });
                initialized = true;
                console.log('[Firebase Admin] Initialized via local serviceAccountKey.json');
            }
        } catch (e) {
            console.warn('[Firebase Admin] serviceAccountKey.json fallback skipped:', e.message);
        }
    }

    if (!initialized) {
        if (process.env.NODE_ENV === 'production') {
            console.warn('[Firebase Admin] ⚠️ No valid Firebase credentials configured in production. FCM push will be skipped.');
        } else {
            console.log('[Firebase Admin] Dev mode: Firebase credentials not set or placeholder. FCM push notifications disabled.');
        }
    }

}

module.exports = admin;
