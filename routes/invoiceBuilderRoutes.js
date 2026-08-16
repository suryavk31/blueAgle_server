const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/invoiceBuilderController');
const { verifyAdminToken, requirePermission } = require('../middleware/adminAuthMiddleware');

// Customer / Admin Render Order Invoice API
router.get('/order/:orderId/render', ctrl.renderOrderInvoice);
router.get('/order/:orderId/download', ctrl.downloadOrderInvoiceHtml);
router.post('/order/:orderId/generate', ctrl.generateOrderInvoice);

// Admin Category & Variable endpoints
router.get('/categories', verifyAdminToken, requirePermission('InvoiceBuilder', 'View'), ctrl.listCategories);
router.post('/categories', verifyAdminToken, requirePermission('InvoiceBuilder', 'Create'), ctrl.createCategory);
router.get('/variables', verifyAdminToken, requirePermission('InvoiceBuilder', 'View'), ctrl.listVariables);

// Admin Settings endpoints
router.get('/settings', verifyAdminToken, requirePermission('InvoiceBuilder', 'View'), ctrl.getInvoiceSettings);
router.post('/settings', verifyAdminToken, requirePermission('InvoiceBuilder', 'Update'), ctrl.updateInvoiceSettings);

// Admin Template Management routes
router.get('/templates', verifyAdminToken, requirePermission('InvoiceBuilder', 'View'), ctrl.listTemplates);
router.get('/templates/:id', verifyAdminToken, requirePermission('InvoiceBuilder', 'View'), ctrl.getTemplateById);
router.post('/templates', verifyAdminToken, requirePermission('InvoiceBuilder', 'Create'), ctrl.createTemplate);
router.put('/templates/:id', verifyAdminToken, requirePermission('InvoiceBuilder', 'Update'), ctrl.updateTemplate);
router.delete('/templates/:id', verifyAdminToken, requirePermission('InvoiceBuilder', 'Delete'), ctrl.deleteTemplate);
router.post('/templates/:id/default', verifyAdminToken, requirePermission('InvoiceBuilder', 'SetDefault'), ctrl.setDefaultTemplate);
router.post('/templates/:id/duplicate', verifyAdminToken, requirePermission('InvoiceBuilder', 'Create'), ctrl.duplicateTemplate);
router.post('/templates/:id/restore/:versionId', verifyAdminToken, requirePermission('InvoiceBuilder', 'Update'), ctrl.restoreTemplateVersion);

module.exports = router;
