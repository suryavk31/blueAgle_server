const { ActivityLog, AdminUser } = require('../models');
const { Op } = require('sequelize');

// ─── List Activity Logs ───────────────────────────────────────────────────────

exports.listActivityLogs = async (req, res) => {
    try {
        const {
            page = 1, limit = 50,
            adminUserId = '',
            module = '',
            action = '',
            search = '',
            dateFrom = '',
            dateTo = '',
        } = req.query;

        const offset = (parseInt(page) - 1) * parseInt(limit);
        const where = {};

        if (adminUserId) where.adminUserId = adminUserId;
        if (module) where.module = module;
        if (action) where.action = action;
        if (search) where.description = { [Op.like]: `%${search}%` };
        if (dateFrom || dateTo) {
            where.createdAt = {};
            if (dateFrom) where.createdAt[Op.gte] = new Date(dateFrom);
            if (dateTo) where.createdAt[Op.lte] = new Date(dateTo + 'T23:59:59');
        }

        const { count, rows } = await ActivityLog.findAndCountAll({
            where,
            include: [{
                model: AdminUser,
                as: 'adminUser',
                attributes: ['id', 'firstName', 'lastName', 'email', 'avatar'],
                required: false,
            }],
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

// ─── Get Activity Log Stats ───────────────────────────────────────────────────

exports.getActivityStats = async (req, res) => {
    try {
        const total = await ActivityLog.count();
        const today = await ActivityLog.count({
            where: { createdAt: { [Op.gte]: new Date(new Date().setHours(0, 0, 0, 0)) } },
        });

        const recentActions = await ActivityLog.findAll({
            limit: 5,
            order: [['createdAt', 'DESC']],
            include: [{ model: AdminUser, as: 'adminUser', attributes: ['firstName', 'lastName'], required: false }],
        });

        return res.json({ total, today, recentActions });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

// ─── Export Activity Logs as CSV ──────────────────────────────────────────────

exports.exportActivityLogs = async (req, res) => {
    try {
        const { dateFrom, dateTo, adminUserId, module, action } = req.query;
        const where = {};
        if (adminUserId) where.adminUserId = adminUserId;
        if (module) where.module = module;
        if (action) where.action = action;
        if (dateFrom || dateTo) {
            where.createdAt = {};
            if (dateFrom) where.createdAt[Op.gte] = new Date(dateFrom);
            if (dateTo) where.createdAt[Op.lte] = new Date(dateTo + 'T23:59:59');
        }

        const logs = await ActivityLog.findAll({
            where,
            include: [{ model: AdminUser, as: 'adminUser', attributes: ['firstName', 'lastName', 'email'], required: false }],
            order: [['createdAt', 'DESC']],
            limit: 10000,
        });

        const rows = [
            ['Time', 'Admin', 'Email', 'Module', 'Action', 'Description', 'IP Address'],
            ...logs.map(l => [
                l.createdAt?.toISOString(),
                l.adminUser ? `${l.adminUser.firstName} ${l.adminUser.lastName}` : 'System',
                l.adminUser?.email || '',
                l.module,
                l.action,
                (l.description || '').replace(/"/g, '""'),
                l.ipAddress || '',
            ]),
        ];
        const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="activity-logs.csv"');
        return res.send(csv);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};
