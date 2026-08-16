const { Module, Permission } = require('../models');
const permissionCache = require('../utils/permissionCache');
const { logActivity } = require('../utils/activityLogger');
const { Op } = require('sequelize');

// ─── List Modules (with hierarchy) ───────────────────────────────────────────

exports.listModules = async (req, res) => {
    try {
        const { search = '' } = req.query;
        const where = { parentModuleId: null }; // Top-level only first
        if (search) where.name = { [Op.like]: `%${search}%` };

        const modules = await Module.findAll({
            where: search ? { [Op.or]: [
                { name: { [Op.like]: `%${search}%` } },
                { displayName: { [Op.like]: `%${search}%` } },
            ]} : { parentModuleId: null },
            include: [{
                model: Module,
                as: 'children',
                include: [{
                    model: Module,
                    as: 'children', // 3 levels deep
                }],
                order: [['sortOrder', 'ASC']],
            }],
            order: [['sortOrder', 'ASC']],
        });

        return res.json(modules);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

// ─── List flat modules (for selects) ─────────────────────────────────────────

exports.listModulesFlat = async (req, res) => {
    try {
        const modules = await Module.findAll({
            order: [['sortOrder', 'ASC'], ['name', 'ASC']],
        });
        return res.json(modules);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

// ─── Get My Modules (filtered by admin's permissions — for sidebar) ───────────

exports.getMyModules = async (req, res) => {
    try {
        const admin = req.adminUser;

        // Super Admin sees all visible, active modules
        const whereModule = { isVisible: true, isActive: true };

        const allModules = await Module.findAll({
            where: whereModule,
            include: [{
                model: Module,
                as: 'children',
                where: { isVisible: true, isActive: true },
                required: false,
                include: [{
                    model: Module,
                    as: 'children',
                    where: { isVisible: true, isActive: true },
                    required: false,
                }],
            }],
            order: [['sortOrder', 'ASC']],
        });

        // Filter by permissions if not Super Admin
        const filterByPermission = (modules) => {
            if (admin.isSuperAdmin) return modules;

            return modules
                .map(mod => {
                    const children = (mod.children || []).filter(child => {
                        const grandChildren = (child.children || []).filter(gc =>
                            admin.permissions.has(`${gc.name}.View`)
                        );
                        const hasChildAccess = admin.permissions.has(`${child.name}.View`) || grandChildren.length > 0;
                        return hasChildAccess;
                    }).map(child => ({
                        ...child.toJSON(),
                        children: (child.children || []).filter(gc => admin.permissions.has(`${gc.name}.View`)),
                    }));

                    const hasAccess = admin.permissions.has(`${mod.name}.View`) || children.length > 0;
                    if (!hasAccess) return null;
                    return { ...mod.toJSON(), children };
                })
                .filter(Boolean);
        };

        const topLevel = allModules.filter(m => !m.parentModuleId);
        const filtered = filterByPermission(topLevel);

        return res.json(filtered);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

// ─── Create Module ────────────────────────────────────────────────────────────

exports.createModule = async (req, res) => {
    const { name, displayName, slug, route, parentModuleId, icon, sortOrder, description, isVisible, isActive } = req.body;

    if (!name || !displayName || !slug) {
        return res.status(400).json({ message: 'name, displayName, and slug are required' });
    }

    try {
        const existing = await Module.findOne({ where: { [Op.or]: [{ name }, { slug }] } });
        if (existing) return res.status(409).json({ message: 'Module name or slug already exists' });

        const module = await Module.create({
            name, displayName, slug, route, parentModuleId: parentModuleId || null,
            icon, sortOrder: sortOrder || 0, description,
            isVisible: isVisible !== undefined ? isVisible : true,
            isActive: isActive !== undefined ? isActive : true,
        });

        // Auto-create standard permissions for new module
        const permTypes = ['View', 'Create', 'Update', 'Delete', 'Export', 'Import', 'Approve', 'Reject', 'Publish', 'Unpublish', 'Manage'];
        const permissions = permTypes.map(type => ({
            moduleId: module.id,
            permissionKey: `${name}.${type}`,
            displayName: `${type} ${displayName}`,
            description: `Can ${type.toLowerCase()} ${displayName}`,
        }));
        await Permission.bulkCreate(permissions, { ignoreDuplicates: true });

        permissionCache.flush(); // New module = flush all

        await logActivity({
            adminUserId: req.adminUser.id,
            module: 'Modules',
            action: 'Create',
            description: `Created module: ${name}`,
            targetId: module.id,
            req,
        });

        return res.status(201).json({ message: 'Module created with permissions', module });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

// ─── Update Module ────────────────────────────────────────────────────────────

exports.updateModule = async (req, res) => {
    const { id } = req.params;
    const { displayName, slug, route, parentModuleId, icon, sortOrder, description, isVisible, isActive } = req.body;

    try {
        const module = await Module.findByPk(id);
        if (!module) return res.status(404).json({ message: 'Module not found' });

        const updates = {};
        if (displayName !== undefined) updates.displayName = displayName;
        if (slug !== undefined) updates.slug = slug;
        if (route !== undefined) updates.route = route;
        if (parentModuleId !== undefined) updates.parentModuleId = parentModuleId || null;
        if (icon !== undefined) updates.icon = icon;
        if (sortOrder !== undefined) updates.sortOrder = sortOrder;
        if (description !== undefined) updates.description = description;
        if (isVisible !== undefined) updates.isVisible = isVisible;
        if (isActive !== undefined) updates.isActive = isActive;

        await module.update(updates);
        permissionCache.flush();

        await logActivity({
            adminUserId: req.adminUser.id,
            module: 'Modules',
            action: 'Update',
            description: `Updated module: ${module.name}`,
            targetId: id,
            req,
        });

        return res.json({ message: 'Module updated', module });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

// ─── Delete Module ────────────────────────────────────────────────────────────

exports.deleteModule = async (req, res) => {
    const { id } = req.params;
    try {
        const module = await Module.findByPk(id);
        if (!module) return res.status(404).json({ message: 'Module not found' });

        const childCount = await Module.count({ where: { parentModuleId: id } });
        if (childCount > 0) {
            return res.status(409).json({ message: 'Cannot delete module with sub-modules. Delete children first.' });
        }

        // Cascade delete permissions
        await Permission.destroy({ where: { moduleId: id } });
        await module.destroy();
        permissionCache.flush();

        await logActivity({
            adminUserId: req.adminUser.id,
            module: 'Modules',
            action: 'Delete',
            description: `Deleted module: ${module.name}`,
            targetId: id,
            req,
        });

        return res.json({ message: 'Module deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};
