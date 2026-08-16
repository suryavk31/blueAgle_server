const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/invitationsController');
const { verifyAdminToken, requirePermission } = require('../middleware/adminAuthMiddleware');

// Public routes (token-based, no auth required)
router.get('/accept/:token', ctrl.getInvitationByToken);
router.post('/accept/:token', ctrl.acceptInvitation);

// Protected routes
router.use(verifyAdminToken);

router.get('/', requirePermission('Invitations', 'View'), ctrl.listInvitations);
router.post('/', requirePermission('Invitations', 'Create'), ctrl.sendInvitation);
router.post('/:id/resend', requirePermission('Invitations', 'Create'), ctrl.resendInvitation);
router.delete('/:id/cancel', requirePermission('Invitations', 'Delete'), ctrl.cancelInvitation);

module.exports = router;
