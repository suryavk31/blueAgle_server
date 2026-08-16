const jwt = require('jsonwebtoken');
const { AdminUser, Role, Permission, RolePermission } = require('../models');
const permissionCache = require('../utils/permissionCache');

/**
 * verifyAdminToken
 * Validates the admin JWT, loads the admin user + permissions into req.adminUser.
 * Super Admins get an isSuperAdmin flag that bypasses all permission checks.
 */
const verifyAdminToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Admin authentication required' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.ADMIN_JWT_SECRET);

        // Check cache first
        let cached = permissionCache.get(decoded.adminId);

        if (!cached) {
            // Load from DB
            const admin = await AdminUser.findByPk(decoded.adminId, {
                include: [{
                    model: Role,
                    as: 'role',
                    include: [{
                        model: Permission,
                        as: 'permissions',
                        attributes: ['permissionKey'],
                    }],
                }],
            });

            if (!admin || admin.status !== 'Active') {
                return res.status(401).json({ message: 'Admin account not found or inactive' });
            }

            const isSuperAdmin = admin.role?.name === 'Super Admin';
            const permissionSet = new Set(
                (admin.role?.permissions || []).map(p => p.permissionKey)
            );

            cached = {
                id: admin.id,
                email: admin.email,
                firstName: admin.firstName,
                lastName: admin.lastName,
                avatar: admin.avatar,
                roleId: admin.roleId,
                roleName: admin.role?.name || null,
                isSuperAdmin,
                permissions: permissionSet,
            };
            permissionCache.set(admin.id, cached);
        }

        req.adminUser = cached;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Admin session expired. Please log in again.', code: 'TOKEN_EXPIRED' });
        }
        return res.status(401).json({ message: 'Invalid admin token' });
    }
};

/**
 * requirePermission(moduleName, actionType)
 * Factory that returns middleware enforcing a specific permission.
 * Super Admins bypass all checks.
 *
 * Usage:
 *   router.post('/', verifyAdminToken, requirePermission('Products', 'Create'), handler)
 */
const requirePermission = (moduleName, actionType) => {
    return (req, res, next) => {
        const admin = req.adminUser;
        if (!admin) {
            return res.status(401).json({ message: 'Admin not authenticated' });
        }

        // Super Admin has unrestricted access
        if (admin.isSuperAdmin) return next();

        const key = `${moduleName}.${actionType}`;
        if (!admin.permissions.has(key)) {
            return res.status(403).json({
                message: `Access denied. Required permission: ${key}`,
                requiredPermission: key,
            });
        }

        next();
    };
};

/**
 * requireSuperAdmin
 * Allows only Super Admin users (for dangerous system-level operations).
 */
const requireSuperAdmin = (req, res, next) => {
    if (!req.adminUser) {
        return res.status(401).json({ message: 'Admin not authenticated' });
    }
    if (!req.adminUser.isSuperAdmin) {
        return res.status(403).json({ message: 'This action requires Super Admin access' });
    }
    next();
};

module.exports = { verifyAdminToken, requirePermission, requireSuperAdmin };
