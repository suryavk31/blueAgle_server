const { Role, Permission, RolePermission, AdminUser, Module } = require('../models');
const permissionCache = require('../utils/permissionCache');
const { logActivity } = require('../utils/activityLogger');
const { Op } = require('sequelize');

// ─── List Roles ───────────────────────────────────────────────────────────────

exports.listRoles = async (req, res) => {
    try {
        const { search = '' } = req.query;
        const where = {};
        if (search) where.name = { [Op.like]: `%${search}%` };

        const roles = await Role.findAll({
            where,
            include: [{
                model: Permission,
                as: 'permissions',
                attributes: ['id', 'permissionKey', 'displayName'],
                through: { attributes: [] },
            }],
            order: [['isSystemRole', 'DESC'], ['name', 'ASC']],
        });

        // Add member count per role
        const withCounts = await Promise.all(roles.map(async (role) => {
            const count = await AdminUser.count({ where: { roleId: role.id } });
            return { ...role.toJSON(), memberCount: count };
        }));

        return res.json(withCounts);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

// ─── Get Single Role ──────────────────────────────────────────────────────────

exports.getRole = async (req, res) => {
    try {
        const role = await Role.findByPk(req.params.id, {
            include: [{
                model: Permission,
                as: 'permissions',
                attributes: ['id', 'permissionKey', 'displayName'],
                include: [{ model: Module, as: 'module', attributes: ['id', 'name', 'displayName'] }],
                through: { attributes: [] },
            }],
        });
        if (!role) return res.status(404).json({ message: 'Role not found' });
        return res.json(role);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

// ─── Create Role ──────────────────────────────────────────────────────────────

exports.createRole = async (req, res) => {
    const { name, description, permissionIds = [] } = req.body;
    if (!name) return res.status(400).json({ message: 'Role name is required' });

    try {
        const existing = await Role.findOne({ where: { name } });
        if (existing) return res.status(409).json({ message: 'Role name already exists' });

        const role = await Role.create({
            name,
            description,
            isSystemRole: false,
            isActive: true,
            createdBy: req.adminUser.id,
        });

        if (permissionIds.length > 0) {
            const records = permissionIds.map(pid => ({ roleId: role.id, permissionId: pid }));
            await RolePermission.bulkCreate(records, { ignoreDuplicates: true });
        }

        await logActivity({
            adminUserId: req.adminUser.id,
            module: 'Roles',
            action: 'Create',
            description: `Created role: ${name}`,
            targetId: role.id,
            newValues: { name, description, permissionIds },
            req,
        });

        return res.status(201).json({ message: 'Role created', role });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

// ─── Update Role ──────────────────────────────────────────────────────────────

exports.updateRole = async (req, res) => {
    const { id } = req.params;
    const { name, description, isActive } = req.body;

    try {
        const role = await Role.findByPk(id);
        if (!role) return res.status(404).json({ message: 'Role not found' });

        const oldValues = { name: role.name, description: role.description, isActive: role.isActive };
        const updates = { updatedBy: req.adminUser.id };
        if (name) updates.name = name;
        if (description !== undefined) updates.description = description;
        if (isActive !== undefined) updates.isActive = isActive;

        await role.update(updates);
        permissionCache.invalidateByRole(parseInt(id));

        await logActivity({
            adminUserId: req.adminUser.id,
            module: 'Roles',
            action: 'Update',
            description: `Updated role: ${role.name}`,
            targetId: id,
            oldValues,
            newValues: updates,
            req,
        });

        return res.json({ message: 'Role updated', role });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

// ─── Delete Role ──────────────────────────────────────────────────────────────

exports.deleteRole = async (req, res) => {
    const { id } = req.params;
    try {
        const role = await Role.findByPk(id);
        if (!role) return res.status(404).json({ message: 'Role not found' });
        if (role.isSystemRole) return res.status(403).json({ message: 'System roles cannot be deleted' });

        const usageCount = await AdminUser.count({ where: { roleId: id } });
        if (usageCount > 0) {
            return res.status(409).json({ message: `Cannot delete: ${usageCount} admin(s) are assigned this role` });
        }

        await RolePermission.destroy({ where: { roleId: id } });
        await role.destroy();
        permissionCache.invalidateByRole(parseInt(id));

        await logActivity({
            adminUserId: req.adminUser.id,
            module: 'Roles',
            action: 'Delete',
            description: `Deleted role: ${role.name}`,
            targetId: id,
            req,
        });

        return res.json({ message: 'Role deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

// ─── Duplicate Role ───────────────────────────────────────────────────────────

exports.duplicateRole = async (req, res) => {
    const { id } = req.params;
    try {
        const source = await Role.findByPk(id, {
            include: [{ model: Permission, as: 'permissions', through: { attributes: [] } }],
        });
        if (!source) return res.status(404).json({ message: 'Role not found' });

        const newRole = await Role.create({
            name: `${source.name} (Copy)`,
            description: source.description,
            isSystemRole: false,
            isActive: true,
            createdBy: req.adminUser.id,
        });

        if (source.permissions?.length > 0) {
            const records = source.permissions.map(p => ({ roleId: newRole.id, permissionId: p.id }));
            await RolePermission.bulkCreate(records, { ignoreDuplicates: true });
        }

        await logActivity({
            adminUserId: req.adminUser.id,
            module: 'Roles',
            action: 'Duplicate',
            description: `Duplicated role '${source.name}' as '${newRole.name}'`,
            targetId: newRole.id,
            req,
        });

        return res.status(201).json({ message: 'Role duplicated', role: newRole });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

// ─── Update Role Permissions (Matrix Save) ────────────────────────────────────

exports.updateRolePermissions = async (req, res) => {
    const { id } = req.params;
    const { permissionIds = [] } = req.body;

    try {
        const role = await Role.findByPk(id);
        if (!role) return res.status(404).json({ message: 'Role not found' });
        if (role.isSystemRole && role.name === 'Super Admin') {
            return res.status(403).json({ message: 'Cannot modify Super Admin permissions' });
        }

        // Atomic replace: delete all, re-insert
        await RolePermission.destroy({ where: { roleId: id } });
        if (permissionIds.length > 0) {
            const records = permissionIds.map(pid => ({ roleId: parseInt(id), permissionId: pid }));
            await RolePermission.bulkCreate(records, { ignoreDuplicates: true });
        }

        permissionCache.invalidateByRole(parseInt(id));

        await logActivity({
            adminUserId: req.adminUser.id,
            module: 'Roles',
            action: 'PermissionChange',
            description: `Updated permissions for role: ${role.name} (${permissionIds.length} permissions)`,
            targetId: id,
            newValues: { permissionIds },
            req,
        });

        return res.json({ message: 'Permissions updated', permissionsChanged: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};
