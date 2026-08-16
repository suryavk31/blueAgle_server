const Razorpay = require('razorpay');

// Environment is already loaded by config/env.js (required first in server.js).
// The dotenv call below is kept for standalone script compatibility.
require('dotenv').config();

const keyId = process.env.RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;

if (!keyId || !keySecret) {
    if (process.env.NODE_ENV === 'production') {
        throw new Error('[Razorpay] RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set in production.');
    }
    console.warn('[Razorpay] RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET not set. Online payment will not work in this environment.');
}

const instance = new Razorpay({
    key_id: keyId || '',
    key_secret: keySecret || '',
});

module.exports = instance;
