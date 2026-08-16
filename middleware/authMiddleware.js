const admin = require('firebase-admin');
require('dotenv').config();
const path = require('path');
const fs = require('fs');

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
        const serviceAccount = typeof process.env.FIREBASE_SERVICE_ACCOUNT === 'string'
            ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
            : process.env.FIREBASE_SERVICE_ACCOUNT;
        if (!admin.apps.length) {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
            });
            console.log("Firebase Admin initialized successfully.");
        }
    } catch (e) {
        console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT:", e.message);
    }
} else {
    if (process.env.NODE_ENV === 'production') {
        throw new Error('FIREBASE_SERVICE_ACCOUNT must be set in production.');
    }
    console.warn('FIREBASE_SERVICE_ACCOUNT not set — running in dev mode with unverified token fallback.');
}

const parseJwtPayload = (token) => {
    try {
        const base64Url = token.split('.')[1];
        if (!base64Url) return null;
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = Buffer.from(base64, 'base64').toString('utf8');
        return JSON.parse(jsonPayload);
    } catch (e) {
        return null;
    }
};

const verifyToken = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'No token provided' });
    }

    try {
        if (admin.apps.length > 0) {
            const decodedToken = await admin.auth().verifyIdToken(token);
            req.user = decodedToken;
        } else {
            // Dev-only fallback: decode without signature verification.
            // Never reached in production (server startup throws above).
            const decodedPayload = parseJwtPayload(token);
            if (!decodedPayload) {
                return res.status(401).json({ message: 'Invalid token structure' });
            }
            req.user = {
                uid: decodedPayload.sub || decodedPayload.user_id,
                phone_number: decodedPayload.phone_number || decodedPayload.phone,
                phone: decodedPayload.phone_number || decodedPayload.phone,
                email: decodedPayload.email
            };
        }
        next();
    } catch (error) {
        console.error('Auth Error:', error.message);
        res.status(401).json({ message: 'Invalid or expired token' });
    }
};

const isAdmin = async (req, res, next) => {
    const { User } = require('../models');
    const { Op } = require('sequelize');
    try {
        const phone = req.user?.phone_number || req.user?.phone;
        const email = req.user?.email;

        const orConditions = [];
        if (phone) {
            orConditions.push({ phone: phone.replace(/^\+91/, '') });
            orConditions.push({ phone: phone });
        }
        if (email) {
            orConditions.push({ email });
        }

        let user = null;
        if (orConditions.length > 0) {
            user = await User.findOne({ where: { [Op.or]: orConditions } });
        }

        // Strict: no fallback — if user not found, deny access
        if (!user || user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Admins only.' });
        }
        req.dbUser = user;
        next();
    } catch (error) {
        console.error('isAdmin Error:', error);
        res.status(500).json({ message: 'Server error checking admin status' });
    }
};


module.exports = { verifyToken, isAdmin };
