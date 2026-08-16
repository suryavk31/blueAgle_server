const { User, Cart, CartItem, Address, Order } = require('../models');
const { sendAccountDeletionEmail } = require('../utils/emailService');
const { logActivity } = require('../utils/activityLogger');
const { Op } = require('sequelize');

// ─── Customer Account Deletion API ─────────────────────────────────────────────

exports.deleteAccount = async (req, res) => {
    try {
        const userId = req.user.id;
        const { reason, feedback, confirmText } = req.body;

        if (confirmText !== 'DELETE') {
            return res.status(400).json({ message: 'Invalid confirmation text. Type DELETE to confirm.' });
        }

        const user = await User.findByPk(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });
        if (user.status === 'Deleted') return res.status(400).json({ message: 'Account is already deleted' });

        const originalEmail = user.email;
        const originalName = user.name || 'Customer';
        const deletedAt = new Date();

        // 1. Purge transient customer data (Cart, Wishlist, Saved Addresses)
        const cart = await Cart.findOne({ where: { userId } });
        if (cart) {
            await CartItem.destroy({ where: { cartId: cart.id } });
            await cart.destroy();
        }
        await Address.destroy({ where: { userId } });

        // 2. Anonymize PII on User record to protect privacy while preserving foreign key integrity for tax/accounting orders
        await user.update({
            name: `Anonymized User #${user.id}`,
            email: `deleted_user_${user.id}@anonymized.local`,
            phone: `DELETED_${user.id}_${Date.now()}`,
            status: 'Deleted',
            deletedAt,
            deletionReason: reason || 'User requested deletion',
            deletionFeedback: feedback || null,
            anonymizedAt: deletedAt,
        });

        // 3. Send Account Deletion Confirmation Email
        if (originalEmail) {
            sendAccountDeletionEmail({
                to: originalEmail,
                userName: originalName,
                deletedAt,
            }).catch(console.error);
        }

        return res.json({
            message: 'Account deleted and personal data anonymized successfully.',
            deletedAt,
        });
    } catch (err) {
        console.error('Account Deletion Error:', err);
        res.status(500).json({ message: 'Server error during account deletion' });
    }
};

// ─── Admin Deleted Accounts Audit Controller ───────────────────────────────────

exports.listDeletedAccounts = async (req, res) => {
    try {
        const { page = 1, limit = 20, search = '', dateFrom = '', dateTo = '' } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        const where = { status: 'Deleted' };

        if (search) {
            where[Op.or] = [
                { deletionReason: { [Op.like]: `%${search}%` } },
                { deletionFeedback: { [Op.like]: `%${search}%` } },
                { id: search },
            ];
        }

        if (dateFrom || dateTo) {
            where.deletedAt = {};
            if (dateFrom) where.deletedAt[Op.gte] = new Date(dateFrom);
            if (dateTo) where.deletedAt[Op.lte] = new Date(dateTo + 'T23:59:59');
        }

        const { count, rows } = await User.findAndCountAll({
            where,
            attributes: ['id', 'name', 'email', 'status', 'deletedAt', 'deletionReason', 'deletionFeedback', 'anonymizedAt', 'createdAt'],
            limit: parseInt(limit),
            offset,
            order: [['deletedAt', 'DESC']],
        });

        // Attach order count per deleted user
        const data = await Promise.all(rows.map(async (u) => {
            const orderCount = await Order.count({ where: { userId: u.id } });
            return { ...u.toJSON(), retainedOrderCount: orderCount };
        }));

        return res.json({
            data,
            pagination: {
                total: count,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(count / parseInt(limit)),
            },
        });
    } catch (err) {
        console.error('List Deleted Accounts Error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

// ─── Export Deleted Accounts as CSV ───────────────────────────────────────────

exports.exportDeletedAccounts = async (req, res) => {
    try {
        const { dateFrom, dateTo } = req.query;
        const where = { status: 'Deleted' };

        if (dateFrom || dateTo) {
            where.deletedAt = {};
            if (dateFrom) where.deletedAt[Op.gte] = new Date(dateFrom);
            if (dateTo) where.deletedAt[Op.lte] = new Date(dateTo + 'T23:59:59');
        }

        const users = await User.findAll({
            where,
            attributes: ['id', 'name', 'email', 'deletedAt', 'deletionReason', 'deletionFeedback', 'anonymizedAt'],
            order: [['deletedAt', 'DESC']],
        });

        const rows = [
            ['User ID', 'Anonymized Name', 'Anonymized Email', 'Deleted Date', 'Deletion Reason', 'Feedback', 'Anonymized Date'],
            ...users.map(u => [
                u.id,
                u.name,
                u.email,
                u.deletedAt ? new Date(u.deletedAt).toISOString() : '',
                (u.deletionReason || '').replace(/"/g, '""'),
                (u.deletionFeedback || '').replace(/"/g, '""'),
                u.anonymizedAt ? new Date(u.anonymizedAt).toISOString() : '',
            ]),
        ];

        const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="deleted-accounts-audit.csv"');
        return res.send(csv);
    } catch (err) {
        console.error('Export Deleted Accounts Error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};
