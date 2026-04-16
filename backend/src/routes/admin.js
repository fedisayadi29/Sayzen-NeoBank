const router = require('express').Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const ctrl = require('../controllers/adminController');

router.use(authenticate, requireAdmin);

router.get('/stats', ctrl.getStats);
router.get('/users', ctrl.getAllUsers);
router.get('/users/:id', ctrl.getUserDetail);
router.get('/users/:id/analytics', ctrl.getUserAnalytics);
router.get('/users/:id/access-logs', ctrl.getUserAccessLogs);
router.patch('/users/:id/kyc', ctrl.updateKyc);
router.patch('/users/:id/toggle', ctrl.toggleUserStatus);
router.patch('/users/:id/lock', ctrl.toggleUserLock);
router.get('/transactions', ctrl.getAllTransactions);
router.patch('/transactions/:id/flag', ctrl.flagTransaction);
router.post('/deposit', ctrl.adminDeposit);
router.get('/loans', ctrl.getAllLoans);
router.patch('/loans/:id', ctrl.updateLoanStatus);
router.get('/fraud-alerts', ctrl.getFraudAlerts);
router.patch('/fraud-alerts/:id', ctrl.resolveFraudAlert);
router.get('/audit-logs', ctrl.getAuditLogs);
router.get('/change-requests', ctrl.getAllChangeRequests);
router.patch('/change-requests/:id', ctrl.reviewChangeRequest);

module.exports = router;
