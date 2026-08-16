const crypto = require('crypto');
const { AdminInvitation, AdminUser, Role } = require('../models');
const { logActivity } = require('../utils/activityLogger');
const { sendInvitationEmail } = require('../utils/emailService');
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');

const INVITATION_EXPIRY_HOURS = 48;

// ─── List Invitations ─────────────────────────────────────────────────────────

exports.listInvitations = async (req, res) => {
    try {
        const { page = 1, limit = 20, search = '', status = '' } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        const where = {};
        if (search) where.email = { [Op.like]: `%${search}%` };
        if (status) where.status = status;

        // Auto-expire invitations
        await AdminInvitation.update(
            { status: 'Expired' },
            { where: { status: 'Pending', expiresAt: { [Op.lt]: new Date() } } }
        );

        const { count, rows } = await AdminInvitation.findAndCountAll({
            where,
            include: [
                { model: AdminUser, as: 'inviter', attributes: ['id', 'firstName', 'lastName', 'email'] },
                { model: Role, as: 'role', attributes: ['id', 'name'] },
            ],
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

// ─── Send Invitation ──────────────────────────────────────────────────────────

exports.sendInvitation = async (req, res) => {
    const { email, roleId, message } = req.body;
    if (!email || !roleId) return res.status(400).json({ message: 'Email and role are required' });

    try {
        // Check if admin already exists
        const existing = await AdminUser.findOne({ where: { email: email.toLowerCase() } });
        if (existing) return res.status(409).json({ message: 'An admin with this email already exists' });

        const role = await Role.findByPk(roleId);
        if (!role) return res.status(404).json({ message: 'Role not found' });

        // Cancel any pending invitation for same email
        await AdminInvitation.update({ status: 'Cancelled' }, { where: { email: email.toLowerCase(), status: 'Pending' } });

        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + INVITATION_EXPIRY_HOURS * 60 * 60 * 1000);

        const invitation = await AdminInvitation.create({
            email: email.toLowerCase(),
            roleId,
            invitedBy: req.adminUser.id,
            invitationToken: token,
            message,
            expiresAt,
            status: 'Pending',
        });

        const inviterName = `${req.adminUser.firstName} ${req.adminUser.lastName}`;
        const acceptUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/admin/invite/accept/${token}`;

        await sendInvitationEmail({ to: email, inviterName, roleName: role.name, acceptUrl, message });

        await logActivity({
            adminUserId: req.adminUser.id,
            module: 'Invitations',
            action: 'InvitationSent',
            description: `Invitation sent to ${email} for role: ${role.name}`,
            targetId: invitation.id,
            req,
        });

        return res.status(201).json({ message: 'Invitation sent', invitation: { id: invitation.id, email, status: 'Pending', expiresAt } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

// ─── Resend Invitation ────────────────────────────────────────────────────────

exports.resendInvitation = async (req, res) => {
    const { id } = req.params;
    try {
        const invitation = await AdminInvitation.findByPk(id, {
            include: [{ model: Role, as: 'role' }],
        });
        if (!invitation) return res.status(404).json({ message: 'Invitation not found' });
        if (invitation.status === 'Accepted') return res.status(400).json({ message: 'Invitation already accepted' });

        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + INVITATION_EXPIRY_HOURS * 60 * 60 * 1000);

        await invitation.update({ invitationToken: token, expiresAt, status: 'Pending' });

        const inviterName = `${req.adminUser.firstName} ${req.adminUser.lastName}`;
        const acceptUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/admin/invite/accept/${token}`;

        await sendInvitationEmail({ to: invitation.email, inviterName, roleName: invitation.role.name, acceptUrl });

        await logActivity({
            adminUserId: req.adminUser.id,
            module: 'Invitations',
            action: 'InvitationResent',
            description: `Invitation resent to ${invitation.email}`,
            targetId: id,
            req,
        });

        return res.json({ message: 'Invitation resent' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

// ─── Cancel Invitation ────────────────────────────────────────────────────────

exports.cancelInvitation = async (req, res) => {
    const { id } = req.params;
    try {
        const invitation = await AdminInvitation.findByPk(id);
        if (!invitation) return res.status(404).json({ message: 'Invitation not found' });
        if (invitation.status !== 'Pending') return res.status(400).json({ message: 'Only pending invitations can be cancelled' });

        await invitation.update({ status: 'Cancelled' });

        await logActivity({
            adminUserId: req.adminUser.id,
            module: 'Invitations',
            action: 'InvitationCancelled',
            description: `Invitation cancelled for ${invitation.email}`,
            targetId: id,
            req,
        });

        return res.json({ message: 'Invitation cancelled' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

// ─── Get Invitation by Token (public — for accept page) ───────────────────────

exports.getInvitationByToken = async (req, res) => {
    const { token } = req.params;
    try {
        const invitation = await AdminInvitation.findOne({
            where: { invitationToken: token },
            include: [{ model: Role, as: 'role', attributes: ['id', 'name'] }],
        });

        if (!invitation) return res.status(404).json({ message: 'Invalid invitation token' });
        if (invitation.status === 'Accepted') return res.status(400).json({ message: 'This invitation has already been accepted' });
        if (invitation.status === 'Cancelled') return res.status(400).json({ message: 'This invitation has been cancelled' });
        if (new Date() > invitation.expiresAt || invitation.status === 'Expired') {
            await invitation.update({ status: 'Expired' });
            return res.status(400).json({ message: 'This invitation has expired' });
        }

        return res.json({
            email: invitation.email,
            roleName: invitation.role?.name,
            invitedBy: invitation.invitedBy,
            expiresAt: invitation.expiresAt,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

// ─── Accept Invitation (public — sets password, creates admin account) ────────

exports.acceptInvitation = async (req, res) => {
    const { token } = req.params;
    const { firstName, lastName, password } = req.body;

    if (!firstName || !lastName || !password) {
        return res.status(400).json({ message: 'First name, last name, and password are required' });
    }
    if (password.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters' });

    try {
        const invitation = await AdminInvitation.findOne({
            where: { invitationToken: token, status: 'Pending' },
        });

        if (!invitation) return res.status(404).json({ message: 'Invalid or expired invitation' });
        if (new Date() > invitation.expiresAt) {
            await invitation.update({ status: 'Expired' });
            return res.status(400).json({ message: 'Invitation has expired' });
        }

        const existing = await AdminUser.findOne({ where: { email: invitation.email } });
        if (existing) return res.status(409).json({ message: 'Account already exists for this email' });

        const passwordHash = await bcrypt.hash(password, 12);
        const admin = await AdminUser.create({
            firstName,
            lastName,
            email: invitation.email,
            passwordHash,
            roleId: invitation.roleId,
            status: 'Active',
            createdBy: invitation.invitedBy,
        });

        await invitation.update({ status: 'Accepted', acceptedAt: new Date() });

        await logActivity({
            adminUserId: admin.id,
            module: 'Invitations',
            action: 'InvitationAccepted',
            description: `Invitation accepted by ${admin.email}`,
            targetId: invitation.id,
            req,
        });

        return res.status(201).json({ message: 'Account created. You can now log in.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};
