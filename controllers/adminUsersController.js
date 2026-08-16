const bcrypt = require('bcryptjs');
const { AdminUser, Role, AdminSession } = require('../models');
const permissionCache = require('../utils/permissionCache');
const { logActivity } = require('../utils/activityLogger');
const { Op } = require('sequelize');

// ─── List Admin Users ─────────────────────────────────────────────────────────

exports.listAdminUsers = async (req, res) => {
    try {
        const { page = 1, limit = 20, search = '', status = '', roleId = '' } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        const where = {};
        if (search) {
            where[Op.or] = [
                { firstName: { [Op.like]: `%${search}%` } },
                { lastName: { [Op.like]: `%${search}%` } },
                { email: { [Op.like]: `%${search}%` } },
            ];
        }
        if (status) where.status = status;
        if (roleId) where.roleId = roleId;

        const { count, rows } = await AdminUser.findAndCountAll({
            where,
            include: [{ model: Role, as: 'role', attributes: ['id', 'name'] }],
            attributes: { exclude: ['passwordHash'] },
            limit: parseInt(limit),
            offset,
            order: [['createdAt', 'DESC']],
        });

        return res.json({
            data: rows,
            pagination: { total: count, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(count / parseInt(limit)) },
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

// ─── Get Single Admin User ────────────────────────────────────────────────────

exports.getAdminUser = async (req, res) => {
    try {
        const admin = await AdminUser.findByPk(req.params.id, {
            attributes: { exclude: ['passwordHash'] },
            include: [{ model: Role, as: 'role', attributes: ['id', 'name'] }],
        });
        if (!admin) return res.status(404).json({ message: 'Admin user not found' });
        return res.json(admin);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

// ─── Create Admin User ────────────────────────────────────────────────────────

exports.createAdminUser = async (req, res) => {
    const { firstName, lastName, email, phone, password, roleId, status, forcePasswordChange } = req.body;

    if (!firstName || !lastName || !email || !password || !roleId) {
        return res.status(400).json({ message: 'firstName, lastName, email, password, roleId are required' });
    }

    try {
        const existing = await AdminUser.findOne({ where: { email: email.toLowerCase() } });
        if (existing) return res.status(409).json({ message: 'Email already registered' });

        const role = await Role.findByPk(roleId);
        if (!role) return res.status(404).json({ message: 'Role not found' });

        const passwordHash = await bcrypt.hash(password, 12);
        const admin = await AdminUser.create({
            firstName,
            lastName,
            email: email.toLowerCase(),
            phone,
            passwordHash,
            roleId,
            status: status || 'Active',
            forcePasswordChange: forcePasswordChange || false,
            createdBy: req.adminUser.id,
        });

        await logActivity({
            adminUserId: req.adminUser.id,
            module: 'AdminUsers',
            action: 'Create',
            description: `Created admin user: ${admin.email}`,
            targetId: admin.id,
            newValues: { firstName, lastName, email, roleId, status },
            req,
        });

        const { passwordHash: _, ...adminData } = admin.toJSON();
        return res.status(201).json({ message: 'Admin user created', admin: adminData });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

// ─── Update Admin User ────────────────────────────────────────────────────────

exports.updateAdminUser = async (req, res) => {
    const { id } = req.params;
    const { firstName, lastName, phone, roleId, status, avatar } = req.body;

    try {
        const admin = await AdminUser.findByPk(id);
        if (!admin) return res.status(404).json({ message: 'Admin user not found' });

        const oldValues = { firstName: admin.firstName, lastName: admin.lastName, roleId: admin.roleId, status: admin.status };

        // Audit safety: prevent self-role demotion from Super Admin
        if (String(id) === String(req.adminUser.id) && roleId && roleId !== admin.roleId) {
            const currentRole = await Role.findByPk(admin.roleId);
            if (currentRole?.name === 'Super Admin') {
                return res.status(403).json({ message: 'Cannot remove your own Super Admin role' });
            }
        }

        const updates = {};
        if (firstName) updates.firstName = firstName;
        if (lastName) updates.lastName = lastName;
        if (phone !== undefined) updates.phone = phone;
        if (roleId) updates.roleId = roleId;
        if (status) updates.status = status;
        if (avatar !== undefined) updates.avatar = avatar;
        updates.updatedBy = req.adminUser.id;

        await admin.update(updates);
        permissionCache.invalidate(parseInt(id));

        await logActivity({
            adminUserId: req.adminUser.id,
            module: 'AdminUsers',
            action: 'Update',
            description: `Updated admin user: ${admin.email}`,
            targetId: id,
            oldValues,
            newValues: updates,
            req,
        });

        const { passwordHash: _, ...adminData } = admin.toJSON();
        return res.json({ message: 'Admin user updated', admin: adminData });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

// ─── Delete Admin User ────────────────────────────────────────────────────────

exports.deleteAdminUser = async (req, res) => {
    const { id } = req.params;

    try {
        // Prevent self-deletion
        if (String(id) === String(req.adminUser.id)) {
            return res.status(403).json({ message: 'Cannot delete your own account' });
        }

        const admin = await AdminUser.findByPk(id, {
            include: [{ model: Role, as: 'role' }],
        });
        if (!admin) return res.status(404).json({ message: 'Admin user not found' });

        // Prevent deleting last Super Admin
        if (admin.role?.name === 'Super Admin') {
            const superAdminCount = await AdminUser.count({
                include: [{ model: Role, as: 'role', where: { name: 'Super Admin' } }],
                where: { status: 'Active' },
            });
            if (superAdminCount <= 1) {
                return res.status(403).json({ message: 'Cannot delete the last Super Admin' });
            }
        }

        await admin.destroy();
        permissionCache.invalidate(parseInt(id));

        await logActivity({
            adminUserId: req.adminUser.id,
            module: 'AdminUsers',
            action: 'Delete',
            description: `Deleted admin user: ${admin.email}`,
            targetId: id,
            req,
        });

        return res.json({ message: 'Admin user deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

// ─── Reset Password ───────────────────────────────────────────────────────────

exports.resetAdminPassword = async (req, res) => {
    const { id } = req.params;
    const { newPassword, forcePasswordChange = true } = req.body;

    if (!newPassword || newPassword.length < 8) {
        return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }

    try {
        const admin = await AdminUser.findByPk(id);
        if (!admin) return res.status(404).json({ message: 'Admin user not found' });

        const hash = await bcrypt.hash(newPassword, 12);
        await admin.update({ passwordHash: hash, forcePasswordChange });
        permissionCache.invalidate(parseInt(id));

        await logActivity({
            adminUserId: req.adminUser.id,
            module: 'AdminUsers',
            action: 'PasswordReset',
            description: `Password reset for admin: ${admin.email}`,
            targetId: id,
            req,
        });

        return res.json({ message: 'Password reset successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

// ─── Get Active Sessions ──────────────────────────────────────────────────────

exports.getAdminSessions = async (req, res) => {
    try {
        const sessions = await AdminSession.findAll({
            where: { adminUserId: req.params.id, status: 'Active' },
            order: [['loginTime', 'DESC']],
        });
        return res.json(sessions);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

// ─── Terminate Session ────────────────────────────────────────────────────────

exports.terminateSession = async (req, res) => {
    try {
        const session = await AdminSession.findByPk(req.params.sessionId);
        if (!session) return res.status(404).json({ message: 'Session not found' });
        await session.update({ status: 'LoggedOut', logoutTime: new Date() });
        permissionCache.invalidate(session.adminUserId);
        return res.json({ message: 'Session terminated' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};
