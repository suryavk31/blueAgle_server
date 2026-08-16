/**
 * RBAC Seeder
 * Run once: node server/seeds/rbacSeed.js
 *
 * Creates:
 *  1. Super Admin Role (system role)
 *  2. All default Modules (matching existing admin pages + new RBAC pages)
 *  3. All Permissions for each module (11 types)
 *  4. Grants Super Admin all permissions
 *  5. Initial Super Admin user
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const bcrypt = require('bcryptjs');
const { sequelize, Role, Module, Permission, RolePermission, AdminUser } = require('../models');

const PERMISSION_TYPES = ['View', 'Create', 'Update', 'Delete', 'Export', 'Import', 'Approve', 'Reject', 'Publish', 'Unpublish', 'Manage'];

const DEFAULT_MODULES = [
    // Top-level Dashboard group
    { name: 'Dashboard',     displayName: 'Dashboard',      slug: 'dashboard',    route: null,                 icon: 'FaTachometerAlt', sortOrder: 1,  parentSlug: null },
    { name: 'DashboardOverview', displayName: 'Overview',   slug: 'dashboard-overview', route: '/admin',       icon: 'FaTachometerAlt', sortOrder: 1,  parentSlug: 'dashboard' },
    { name: 'GoogleAnalytics', displayName: 'Google Analytics', slug: 'google-analytics', route: '/admin/analytics/google', icon: 'FaChartBar', sortOrder: 2, parentSlug: 'dashboard' },
    // Catalog group
    { name: 'Catalog',       displayName: 'Catalog',        slug: 'catalog',      route: null,                 icon: 'FaStore',         sortOrder: 2,  parentSlug: null },
    { name: 'Products',      displayName: 'Products',       slug: 'products',     route: '/admin/products',    icon: 'FaBox',           sortOrder: 1,  parentSlug: 'catalog' },
    { name: 'ProductAttributes', displayName: 'Attributes',  slug: 'product-attributes', route: '/admin/product-attributes', icon: 'FaSlidersH', sortOrder: 2, parentSlug: 'catalog' },
    { name: 'Categories',    displayName: 'Categories',     slug: 'categories',   route: '/admin/categories',  icon: 'FaList',          sortOrder: 3,  parentSlug: 'catalog' },
    // Sales group
    { name: 'Sales',         displayName: 'Sales',          slug: 'sales',        route: null,                 icon: 'FaShoppingBag',   sortOrder: 3,  parentSlug: null },
    { name: 'Orders',        displayName: 'Orders',         slug: 'orders',       route: '/admin/orders',      icon: 'FaShoppingCart',  sortOrder: 1,  parentSlug: 'sales' },
    { name: 'Coupons',       displayName: 'Coupons',        slug: 'coupons',      route: '/admin/coupons',     icon: 'FaTags',          sortOrder: 2,  parentSlug: 'sales' },
    // Marketing group
    { name: 'Marketing',     displayName: 'Marketing',      slug: 'marketing',    route: null,                 icon: 'FaBullhorn',      sortOrder: 4,  parentSlug: null },
    { name: 'Ads',           displayName: 'Ads & Banners',  slug: 'ads',          route: '/admin/ads',         icon: 'FaAd',            sortOrder: 1,  parentSlug: 'marketing' },
    { name: 'SEO',           displayName: 'SEO Manager',    slug: 'seo',          route: '/admin/seo',         icon: 'FaSearch',        sortOrder: 2,  parentSlug: 'marketing' },
    // Customers
    { name: 'Customers',     displayName: 'Customers',      slug: 'customers',    route: '/admin/users',       icon: 'FaUsers',         sortOrder: 5,  parentSlug: null },
    // Reports
    { name: 'Reports',       displayName: 'Reports',        slug: 'reports',      route: '/admin/reports',     icon: 'FaChartBar',      sortOrder: 6,  parentSlug: null },
    // Content
    { name: 'Policies',      displayName: 'Policies',       slug: 'policies',     route: '/admin/policies',    icon: 'FaFileAlt',       sortOrder: 7,  parentSlug: null },
    // Invoice Builder group
    { name: 'InvoiceBuilder', displayName: 'Invoice Builder', slug: 'invoice-builder', route: null, icon: 'FaFileInvoiceDollar', sortOrder: 8, parentSlug: null },
    { name: 'InvoiceTemplates', displayName: 'Invoice Templates', slug: 'invoice-templates', route: '/admin/rbac/invoice-builder/templates', icon: 'FaFileAlt', sortOrder: 1, parentSlug: 'invoice-builder' },
    { name: 'InvoiceCategories', displayName: 'Template Categories', slug: 'invoice-categories', route: '/admin/rbac/invoice-builder/categories', icon: 'FaTags', sortOrder: 2, parentSlug: 'invoice-builder' },
    { name: 'InvoiceVariables', displayName: 'Variables Registry', slug: 'invoice-variables', route: '/admin/rbac/invoice-builder/variables', icon: 'FaCode', sortOrder: 3, parentSlug: 'invoice-builder' },
    { name: 'InvoiceSettings', displayName: 'Invoice Settings', slug: 'invoice-settings', route: '/admin/rbac/invoice-builder/settings', icon: 'FaCog', sortOrder: 4, parentSlug: 'invoice-builder' },
    // Settings
    { name: 'Settings',      displayName: 'Settings',       slug: 'settings',     route: '/admin/settings',    icon: 'FaCog',           sortOrder: 9,  parentSlug: null },
    { name: 'GaSettings',    displayName: 'Google Analytics Setup', slug: 'ga-settings', route: '/admin/settings/google-analytics', icon: 'FaCog', sortOrder: 1, parentSlug: 'settings' },
    { name: 'PaymentSettings', displayName: 'Payment & Tax Settings', slug: 'payment-settings', route: '/admin/settings/payment', icon: 'FaCreditCard', sortOrder: 2, parentSlug: 'settings' },
    // Administration group
    { name: 'Administration', displayName: 'Administration', slug: 'administration', route: null,              icon: 'FaShieldAlt',     sortOrder: 9,  parentSlug: null },
    { name: 'Modules',       displayName: 'Modules',        slug: 'modules',      route: '/admin/rbac/modules',          icon: 'FaCubes',     sortOrder: 1,  parentSlug: 'administration' },
    { name: 'Roles',         displayName: 'Roles',          slug: 'roles',        route: '/admin/rbac/roles',            icon: 'FaUserTag',   sortOrder: 2,  parentSlug: 'administration' },
    { name: 'AdminUsers',    displayName: 'Admin Users',    slug: 'admin-users',  route: '/admin/rbac/admin-users',      icon: 'FaUsersCog', sortOrder: 3,  parentSlug: 'administration' },
    { name: 'Invitations',   displayName: 'Invitations',    slug: 'invitations',  route: '/admin/rbac/invitations',      icon: 'FaEnvelope',  sortOrder: 4,  parentSlug: 'administration' },
    { name: 'ActivityLogs',  displayName: 'Activity Logs',  slug: 'activity-logs',route: '/admin/rbac/activity-logs',    icon: 'FaHistory',   sortOrder: 5,  parentSlug: 'administration' },
];

async function seed() {
    try {
        await sequelize.sync();
        console.log('✅ Database synced');

        // ── 1. Create Super Admin Role ────────────────────────────────────────
        const [superAdminRole] = await Role.findOrCreate({
            where: { name: 'Super Admin' },
            defaults: {
                name: 'Super Admin',
                description: 'Full unrestricted access to all features. Cannot be deleted.',
                isSystemRole: true,
                isActive: true,
            },
        });
        console.log('✅ Super Admin role ready');

        // ── 2. Create Modules ─────────────────────────────────────────────────
        const moduleMap = {}; // slug -> Module instance

        // First pass: create top-level modules
        for (const mod of DEFAULT_MODULES.filter(m => !m.parentSlug)) {
            const [module] = await Module.findOrCreate({
                where: { slug: mod.slug },
                defaults: {
                    name: mod.name,
                    displayName: mod.displayName,
                    slug: mod.slug,
                    route: mod.route,
                    icon: mod.icon,
                    sortOrder: mod.sortOrder,
                    isVisible: true,
                    isActive: true,
                    parentModuleId: null,
                },
            });
            moduleMap[mod.slug] = module;
        }

        // Second pass: create child modules
        for (const mod of DEFAULT_MODULES.filter(m => m.parentSlug)) {
            const parent = moduleMap[mod.parentSlug];
            if (!parent) {
                console.warn(`  ⚠️ Parent module '${mod.parentSlug}' not found for '${mod.slug}'`);
                continue;
            }
            const [module] = await Module.findOrCreate({
                where: { slug: mod.slug },
                defaults: {
                    name: mod.name,
                    displayName: mod.displayName,
                    slug: mod.slug,
                    route: mod.route,
                    icon: mod.icon,
                    sortOrder: mod.sortOrder,
                    isVisible: true,
                    isActive: true,
                    parentModuleId: parent.id,
                },
            });
            moduleMap[mod.slug] = module;
        }
        console.log(`✅ ${Object.keys(moduleMap).length} modules ready`);

        // ── 3. Create Permissions for each module ─────────────────────────────
        let totalPermissions = 0;
        for (const mod of Object.values(moduleMap)) {
            for (const type of PERMISSION_TYPES) {
                await Permission.findOrCreate({
                    where: { permissionKey: `${mod.name}.${type}` },
                    defaults: {
                        moduleId: mod.id,
                        permissionKey: `${mod.name}.${type}`,
                        displayName: `${type} ${mod.displayName}`,
                        description: `Can ${type.toLowerCase()} ${mod.displayName}`,
                    },
                });
                totalPermissions++;
            }
        }
        console.log(`✅ ${totalPermissions} permissions ready`);

        // ── 4. Grant Super Admin ALL permissions ──────────────────────────────
        const allPermissions = await Permission.findAll();
        for (const perm of allPermissions) {
            await RolePermission.findOrCreate({
                where: { roleId: superAdminRole.id, permissionId: perm.id },
                defaults: { roleId: superAdminRole.id, permissionId: perm.id },
            });
        }
        console.log(`✅ Super Admin granted ${allPermissions.length} permissions`);

        // ── 5. Create Initial Super Admin User ────────────────────────────────
        const email = process.env.INITIAL_ADMIN_EMAIL || 'superadmin@blueeagle.com';
        const password = process.env.INITIAL_ADMIN_PASSWORD || 'Admin@123';
        const firstName = process.env.INITIAL_ADMIN_FIRSTNAME || 'Super';
        const lastName = process.env.INITIAL_ADMIN_LASTNAME || 'Admin';

        const existing = await AdminUser.findOne({ where: { email } });
        if (!existing) {
            const hash = await bcrypt.hash(password, 12);
            await AdminUser.create({
                firstName,
                lastName,
                email,
                passwordHash: hash,
                roleId: superAdminRole.id,
                status: 'Active',
            });
            console.log(`✅ Super Admin user created: ${email} / ${password}`);
        } else {
            console.log(`ℹ️  Super Admin user already exists: ${email}`);
        }

        console.log('\n🎉 RBAC Seed completed successfully!\n');
        console.log(`   Login at: /admin/login`);
        console.log(`   Email: ${email}`);
        console.log(`   Password: ${process.env.INITIAL_ADMIN_PASSWORD || 'Admin@123'}`);
        console.log('\n   ⚠️  Change the password after first login!\n');

        process.exit(0);
    } catch (err) {
        console.error('❌ Seed failed:', err);
        process.exit(1);
    }
}

seed();
