const sequelize = require('../config/database');

// ─── Customer Models (DO NOT MODIFY) ────────────────────────────────────────
const User = require('./User');
const Category = require('./Category');
const SubCategory = require('./SubCategory');
const Product = require('./Product');
const Order = require('./Order');
const OrderItem = require('./OrderItem');
const Cart = require('./Cart');
const CartItem = require('./CartItem');
const Coupon = require('./Coupon');
const Policy = require('./Policy');
const PolicyVersion = require('./PolicyVersion');
const Ad = require('./Ad');
const AdAnalytics = require('./AdAnalytics');
const Address = require('./Address');
const SeoSetting = require('./SeoSetting');
const SeoGlobalSetting = require('./SeoGlobalSetting');
const SeoAuditLog = require('./SeoAuditLog');
const DeliverySetting = require('./DeliverySetting');
const Blog = require('./Blog');
const GaSetting = require('./GaSetting');
const PaymentSetting = require('./PaymentSetting');

// ─── Extended Product Metadata Models ────────────────────────────────────────
const ProductHighlight = require('./ProductHighlight');
const ProductSpecification = require('./ProductSpecification');
const ProductBadge = require('./ProductBadge');
const ProductCertification = require('./ProductCertification');
const ProductNutrition = require('./ProductNutrition');
const ProductAttribute = require('./ProductAttribute');
const ProductAttributeValue = require('./ProductAttributeValue');

// ─── Invoice Builder Models ──────────────────────────────────────────────────
const Invoice = require('./Invoice');
const InvoiceTemplate = require('./InvoiceTemplate');
const InvoiceTemplateCategory = require('./InvoiceTemplateCategory');
const InvoiceVariable = require('./InvoiceVariable');
const InvoiceSetting = require('./InvoiceSetting');
const InvoiceTemplateVersion = require('./InvoiceTemplateVersion');

// ─── Admin RBAC Models ───────────────────────────────────────────────────────
const Role = require('./Role');
const AdminUser = require('./AdminUser');
const Module = require('./Module');
const Permission = require('./Permission');
const RolePermission = require('./RolePermission');
const AdminInvitation = require('./AdminInvitation');
const AdminSession = require('./AdminSession');
const ActivityLog = require('./ActivityLog');

// ─── Customer Associations ───────────────────────────────────────────────────

Category.hasMany(SubCategory, { foreignKey: 'categoryId', onDelete: 'CASCADE' });
SubCategory.belongsTo(Category, { foreignKey: 'categoryId' });

SubCategory.hasMany(Product, { foreignKey: 'subCategoryId', onDelete: 'CASCADE' });
Product.belongsTo(SubCategory, { foreignKey: 'subCategoryId' });

Product.hasMany(ProductHighlight, { as: 'highlights', foreignKey: 'productId', onDelete: 'CASCADE' });
ProductHighlight.belongsTo(Product, { foreignKey: 'productId' });

Product.hasMany(ProductSpecification, { as: 'specifications', foreignKey: 'productId', onDelete: 'CASCADE' });
ProductSpecification.belongsTo(Product, { foreignKey: 'productId' });

Product.hasMany(ProductBadge, { as: 'badges', foreignKey: 'productId', onDelete: 'CASCADE' });
ProductBadge.belongsTo(Product, { foreignKey: 'productId' });

Product.hasMany(ProductCertification, { as: 'certifications', foreignKey: 'productId', onDelete: 'CASCADE' });
ProductCertification.belongsTo(Product, { foreignKey: 'productId' });

Product.hasMany(ProductNutrition, { as: 'nutrition', foreignKey: 'productId', onDelete: 'CASCADE' });
ProductNutrition.belongsTo(Product, { foreignKey: 'productId' });

Product.hasMany(ProductAttributeValue, { as: 'attributeValues', foreignKey: 'productId', onDelete: 'CASCADE' });
ProductAttributeValue.belongsTo(Product, { foreignKey: 'productId' });
ProductAttributeValue.belongsTo(ProductAttribute, { as: 'attribute', foreignKey: 'attributeId' });

User.hasOne(Cart, { foreignKey: 'userId', onDelete: 'CASCADE' });
Cart.belongsTo(User, { foreignKey: 'userId' });

Cart.hasMany(CartItem, { foreignKey: 'cartId', onDelete: 'CASCADE' });
CartItem.belongsTo(Cart, { foreignKey: 'cartId' });

Product.hasMany(CartItem, { foreignKey: 'productId', onDelete: 'CASCADE' });
CartItem.belongsTo(Product, { foreignKey: 'productId' });

User.hasMany(Order, { foreignKey: 'userId', onDelete: 'CASCADE' });
Order.belongsTo(User, { foreignKey: 'userId' });

Order.hasMany(OrderItem, { foreignKey: 'orderId', onDelete: 'CASCADE' });
OrderItem.belongsTo(Order, { foreignKey: 'orderId' });

Product.hasMany(OrderItem, { foreignKey: 'productId' });
OrderItem.belongsTo(Product, { foreignKey: 'productId' });

Ad.hasMany(AdAnalytics, { foreignKey: 'adId', onDelete: 'CASCADE' });
AdAnalytics.belongsTo(Ad, { foreignKey: 'adId' });

User.hasMany(Address, { foreignKey: 'userId', onDelete: 'CASCADE' });
Address.belongsTo(User, { foreignKey: 'userId' });

Policy.hasMany(PolicyVersion, { foreignKey: 'policyId', as: 'versions', onDelete: 'CASCADE' });
PolicyVersion.belongsTo(Policy, { foreignKey: 'policyId', as: 'policy' });

// Invoice Builder Associations
InvoiceTemplateCategory.hasMany(InvoiceTemplate, { foreignKey: 'categoryId', as: 'templates' });
InvoiceTemplate.belongsTo(InvoiceTemplateCategory, { foreignKey: 'categoryId', as: 'category' });

InvoiceTemplate.hasMany(InvoiceTemplateVersion, { foreignKey: 'templateId', as: 'versions', onDelete: 'CASCADE' });
InvoiceTemplateVersion.belongsTo(InvoiceTemplate, { foreignKey: 'templateId', as: 'template' });

// ─── Admin RBAC Associations ──────────────────────────────────────────────────

// Role <-> AdminUser (one Role has many AdminUsers)
Role.hasMany(AdminUser, { foreignKey: 'roleId', as: 'adminUsers' });
AdminUser.belongsTo(Role, { foreignKey: 'roleId', as: 'role' });

// Role <-> Permission (many-to-many through RolePermission)
Role.belongsToMany(Permission, {
    through: RolePermission,
    foreignKey: 'roleId',
    otherKey: 'permissionId',
    as: 'permissions',
});
Permission.belongsToMany(Role, {
    through: RolePermission,
    foreignKey: 'permissionId',
    otherKey: 'roleId',
    as: 'roles',
});

// Module <-> Permission (one Module has many Permissions)
Module.hasMany(Permission, { foreignKey: 'moduleId', as: 'permissions', onDelete: 'CASCADE' });
Permission.belongsTo(Module, { foreignKey: 'moduleId', as: 'module' });

// Module self-referential (parent -> children)
Module.hasMany(Module, { foreignKey: 'parentModuleId', as: 'children' });
Module.belongsTo(Module, { foreignKey: 'parentModuleId', as: 'parent' });

// AdminUser <-> AdminSession
AdminUser.hasMany(AdminSession, { foreignKey: 'adminUserId', as: 'sessions', onDelete: 'CASCADE' });
AdminSession.belongsTo(AdminUser, { foreignKey: 'adminUserId', as: 'adminUser' });

// AdminUser <-> AdminInvitation (sent by)
AdminUser.hasMany(AdminInvitation, { foreignKey: 'invitedBy', as: 'sentInvitations' });
AdminInvitation.belongsTo(AdminUser, { foreignKey: 'invitedBy', as: 'inviter' });

// Role <-> AdminInvitation
Role.hasMany(AdminInvitation, { foreignKey: 'roleId', as: 'invitations' });
AdminInvitation.belongsTo(Role, { foreignKey: 'roleId', as: 'role' });

// AdminUser <-> ActivityLog
AdminUser.hasMany(ActivityLog, { foreignKey: 'adminUserId', as: 'activityLogs' });
ActivityLog.belongsTo(AdminUser, { foreignKey: 'adminUserId', as: 'adminUser' });

// Invoice Associations
Order.hasOne(Invoice, { foreignKey: 'orderId' });
Invoice.belongsTo(Order, { foreignKey: 'orderId' });
Invoice.belongsTo(InvoiceTemplate, { foreignKey: 'templateId' });

// ─── Exports ──────────────────────────────────────────────────────────────────
module.exports = {
    sequelize,
    User,
    Category,
    SubCategory,
    Product,
    Order,
    OrderItem,
    Cart,
    CartItem,
    Coupon,
    Policy,
    PolicyVersion,
    Ad,
    AdAnalytics,
    Address,
    SeoSetting,
    SeoGlobalSetting,
    SeoAuditLog,
    DeliverySetting,
    Blog,
    GaSetting,
    PaymentSetting,
    // Extended Product Metadata models
    ProductHighlight,
    ProductSpecification,
    ProductBadge,
    ProductCertification,
    ProductNutrition,
    ProductAttribute,
    ProductAttributeValue,
    // Invoice Builder models
    Invoice,
    InvoiceTemplate,
    InvoiceTemplateCategory,
    InvoiceVariable,
    InvoiceSetting,
    InvoiceTemplateVersion,
    // Admin RBAC models
    Role,
    AdminUser,
    Module,
    Permission,
    RolePermission,
    AdminInvitation,
    AdminSession,
    ActivityLog,
};
