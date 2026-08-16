/**
 * Permission Cache
 * In-memory Map keyed by adminUserId.
 * Stores: { id, email, firstName, lastName, roleId, roleName, isSuperAdmin, permissions: Set<string> }
 *
 * Cache is invalidated when:
 *  - A role's permissions are updated
 *  - An admin user's role is changed
 *  - The admin user's status changes
 */

const cache = new Map();

const TTL_MS = 10 * 60 * 1000; // 10 minutes

const get = (adminId) => {
    const entry = cache.get(adminId);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
        cache.delete(adminId);
        return null;
    }
    return entry.data;
};

const set = (adminId, data) => {
    cache.set(adminId, {
        data,
        expiresAt: Date.now() + TTL_MS,
    });
};

const invalidate = (adminId) => {
    if (adminId) {
        cache.delete(adminId);
    }
};

/**
 * Invalidate all users that belong to a given roleId.
 * Called when role permissions are updated.
 */
const invalidateByRole = (roleId) => {
    for (const [adminId, entry] of cache.entries()) {
        if (entry.data?.roleId === roleId) {
            cache.delete(adminId);
        }
    }
};

/**
 * Flush the entire cache. Called when modules/permissions are restructured.
 */
const flush = () => {
    cache.clear();
};

module.exports = { get, set, invalidate, invalidateByRole, flush };
