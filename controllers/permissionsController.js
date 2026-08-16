const { Permission, Module } = require('../models');
const { Op } = require('sequelize');

// ─── List All Permissions ─────────────────────────────────────────────────────

exports.listPermissions = async (req, res) => {
    try {
        const { moduleId, search = '' } = req.query;
        const where = {};
        if (moduleId) where.moduleId = moduleId;
        if (search) where.permissionKey = { [Op.like]: `%${search}%` };

        const permissions = await Permission.findAll({
            where,
            include: [{ model: Module, as: 'module', attributes: ['id', 'name', 'displayName'] }],
            order: [['moduleId', 'ASC'], ['permissionKey', 'ASC']],
        });

        return res.json(permissions);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

// ─── List Permissions Grouped by Module ───────────────────────────────────────

exports.listPermissionsGrouped = async (req, res) => {
    try {
        const modules = await Module.findAll({
            include: [{
                model: Permission,
                as: 'permissions',
                attributes: ['id', 'permissionKey', 'displayName', 'description'],
            }],
            order: [['sortOrder', 'ASC'], ['name', 'ASC']],
        });
        return res.json(modules);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

// ─── Export Permissions as CSV ────────────────────────────────────────────────

exports.exportPermissions = async (req, res) => {
    try {
        const permissions = await Permission.findAll({
            include: [{ model: Module, as: 'module', attributes: ['name', 'displayName'] }],
            order: [['moduleId', 'ASC'], ['permissionKey', 'ASC']],
        });

        const rows = [
            ['Module', 'Permission Key', 'Display Name', 'Description'],
            ...permissions.map(p => [p.module?.displayName, p.permissionKey, p.displayName, p.description || '']),
        ];
        const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="permissions.csv"');
        return res.send(csv);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};
