const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { AdminUser, Role, Permission, AdminSession } = require('../models');
const permissionCache = require('../utils/permissionCache');
const { logActivity } = require('../utils/activityLogger');
const { sendPasswordResetEmail } = require('../utils/emailService');

// ─── Token Helpers ────────────────────────────────────────────────────────────

const generateAccessToken = (adminId) =>
    jwt.sign({ adminId }, process.env.ADMIN_JWT_SECRET, {
        expiresIn: process.env.ADMIN_JWT_EXPIRY || '15m',
    });

const generateRefreshToken = () => crypto.randomBytes(64).toString('hex');

// ─── Login ────────────────────────────────────────────────────────────────────

exports.login = async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
    }

    try {
        const admin = await AdminUser.findOne({
            where: { email: email.toLowerCase().trim() },
            include: [{ model: Role, as: 'role' }],
        });

        if (!admin) {
            await logActivity({ module: 'Auth', action: 'FailedLogin', description: `Failed login attempt for email: ${email}`, req });
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        if (admin.status !== 'Active') {
            return res.status(403).json({ message: `Your account is ${admin.status}. Contact a Super Admin.` });
        }

        const passwordValid = await bcrypt.compare(password, admin.passwordHash);
        if (!passwordValid) {
            await logActivity({ adminUserId: admin.id, module: 'Auth', action: 'FailedLogin', description: 'Wrong password', req });
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Issue tokens
        const accessToken = generateAccessToken(admin.id);
        const refreshToken = generateRefreshToken();

        // Parse user-agent for session info
        const ua = req.headers['user-agent'] || '';
        const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null;

        // Create session record
        await AdminSession.create({
            adminUserId: admin.id,
            device: ua.includes('Mobile') ? 'Mobile' : 'Desktop',
            browser: ua.substring(0, 200),
            ipAddress: ip,
            refreshToken,
            status: 'Active',
        });

        // Update last login
        await admin.update({ lastLoginAt: new Date(), lastLoginIp: ip });

        await logActivity({ adminUserId: admin.id, module: 'Auth', action: 'Login', description: 'Admin logged in', req });

        return res.json({
            message: 'Login successful',
            accessToken,
            refreshToken,
            admin: {
                id: admin.id,
                firstName: admin.firstName,
                lastName: admin.lastName,
                email: admin.email,
                avatar: admin.avatar,
                roleId: admin.roleId,
                roleName: admin.role?.name,
                isSuperAdmin: admin.role?.name === 'Super Admin',
                forcePasswordChange: admin.forcePasswordChange,
            },
        });
    } catch (err) {
        console.error('Admin login error:', err);
        res.status(500).json({ message: 'Server error during login' });
    }
};

// ─── Get Me (with permissions) ────────────────────────────────────────────────

exports.getMe = async (req, res) => {
    try {
        const admin = await AdminUser.findByPk(req.adminUser.id, {
            attributes: { exclude: ['passwordHash'] },
            include: [{
                model: Role,
                as: 'role',
                include: [{
                    model: Permission,
                    as: 'permissions',
                    attributes: ['permissionKey', 'displayName'],
                }],
            }],
        });

        if (!admin) return res.status(404).json({ message: 'Admin not found' });

        const permissions = admin.role?.permissions?.map(p => p.permissionKey) || [];

        return res.json({
            id: admin.id,
            firstName: admin.firstName,
            lastName: admin.lastName,
            email: admin.email,
            phone: admin.phone,
            avatar: admin.avatar,
            roleId: admin.roleId,
            roleName: admin.role?.name,
            isSuperAdmin: admin.role?.name === 'Super Admin',
            forcePasswordChange: admin.forcePasswordChange,
            lastLoginAt: admin.lastLoginAt,
            permissions,
        });
    } catch (err) {
        console.error('getMe error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

// ─── Refresh Token ────────────────────────────────────────────────────────────

exports.refreshToken = async (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ message: 'Refresh token required' });

    try {
        const session = await AdminSession.findOne({
            where: { refreshToken, status: 'Active' },
        });

        if (!session) return res.status(401).json({ message: 'Invalid or expired refresh token' });

        const admin = await AdminUser.findByPk(session.adminUserId);
        if (!admin || admin.status !== 'Active') {
            return res.status(401).json({ message: 'Admin account inactive' });
        }

        const newAccessToken = generateAccessToken(admin.id);
        const newRefreshToken = generateRefreshToken();

        await session.update({ refreshToken: newRefreshToken });

        return res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
    } catch (err) {
        console.error('Token refresh error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

// ─── Logout ───────────────────────────────────────────────────────────────────

exports.logout = async (req, res) => {
    const { refreshToken } = req.body;
    try {
        if (refreshToken) {
            await AdminSession.update(
                { status: 'LoggedOut', logoutTime: new Date() },
                { where: { refreshToken } }
            );
        }
        permissionCache.invalidate(req.adminUser.id);
        await logActivity({ adminUserId: req.adminUser.id, module: 'Auth', action: 'Logout', description: 'Admin logged out', req });
        return res.json({ message: 'Logged out successfully' });
    } catch (err) {
        console.error('Logout error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

// ─── Forgot Password ──────────────────────────────────────────────────────────

exports.forgotPassword = async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    try {
        const admin = await AdminUser.findOne({ where: { email: email.toLowerCase().trim() } });

        // Always return success to avoid email enumeration
        if (!admin) {
            return res.json({ message: 'If that email exists, a reset link has been sent.' });
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        // Store hashed token
        const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
        await admin.update({
            passwordHash: admin.passwordHash, // don't change yet
            // Store token in a temp field — we'll use a JSON comment pattern
        });

        // We store the raw token in a temp field via the avatar field hack-free:
        // Better: store in AdminSession as a special type
        await AdminSession.create({
            adminUserId: admin.id,
            refreshToken: `RESET:${tokenHash}`,
            status: 'Active',
            loginTime: new Date(),
            logoutTime: resetExpiry,
        });

        const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/admin/reset-password?token=${resetToken}`;
        await sendPasswordResetEmail({ to: admin.email, resetUrl });

        await logActivity({ adminUserId: admin.id, module: 'Auth', action: 'ForgotPassword', description: 'Password reset requested', req });

        return res.json({ message: 'If that email exists, a reset link has been sent.' });
    } catch (err) {
        console.error('Forgot password error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

// ─── Reset Password ───────────────────────────────────────────────────────────

exports.resetPassword = async (req, res) => {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ message: 'Token and password are required' });
    if (password.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters' });

    try {
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

        const session = await AdminSession.findOne({
            where: { refreshToken: `RESET:${tokenHash}`, status: 'Active' },
        });

        if (!session || new Date() > session.logoutTime) {
            return res.status(400).json({ message: 'Reset token is invalid or expired' });
        }

        const admin = await AdminUser.findByPk(session.adminUserId);
        if (!admin) return res.status(404).json({ message: 'Admin not found' });

        const hash = await bcrypt.hash(password, 12);
        await admin.update({ passwordHash: hash, forcePasswordChange: false });
        await session.update({ status: 'LoggedOut' });

        permissionCache.invalidate(admin.id);
        await logActivity({ adminUserId: admin.id, module: 'Auth', action: 'PasswordReset', description: 'Password reset successful', req });

        return res.json({ message: 'Password reset successful. You can now log in.' });
    } catch (err) {
        console.error('Reset password error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

// ─── Change Password ──────────────────────────────────────────────────────────

exports.changePassword = async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ message: 'All fields required' });
    if (newPassword.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters' });

    try {
        const admin = await AdminUser.findByPk(req.adminUser.id);
        const valid = await bcrypt.compare(currentPassword, admin.passwordHash);
        if (!valid) return res.status(400).json({ message: 'Current password is incorrect' });

        const hash = await bcrypt.hash(newPassword, 12);
        await admin.update({ passwordHash: hash, forcePasswordChange: false });
        permissionCache.invalidate(admin.id);
        await logActivity({ adminUserId: admin.id, module: 'Auth', action: 'PasswordChange', description: 'Password changed', req });

        return res.json({ message: 'Password changed successfully' });
    } catch (err) {
        console.error('Change password error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};
