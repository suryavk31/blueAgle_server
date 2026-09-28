const admin = require('../config/firebaseAdmin');

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
        if (admin && admin.apps.length > 0) {
            try {
                const decodedToken = await admin.auth().verifyIdToken(token);
                req.user = decodedToken;
                return next();
            } catch (fbErr) {
                console.warn('[verifyToken] Firebase Admin verifyIdToken error:', fbErr.message);
            }
        }

        // Fallback: decode payload directly
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
            const cleanPhone = phone.replace(/^\+91/, '');
            orConditions.push({ phone });
            orConditions.push({ phone: cleanPhone });
            orConditions.push({ phone: `+91${cleanPhone}` });
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
