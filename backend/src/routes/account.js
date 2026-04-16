const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const multer = require('multer');
const ctrl = require('../controllers/accountController');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.use(authenticate);

router.get('/accounts', ctrl.getMyAccounts);
router.get('/transactions', ctrl.getMyTransactions);
router.post('/transfer', ctrl.transfer);
router.get('/cards', ctrl.getMyCards);
router.patch('/cards/:id', ctrl.updateCardSettings);
router.put('/profile', ctrl.updateProfile);
router.get('/profile/change-requests', ctrl.getMyChangeRequests);
router.get('/notifications', ctrl.getNotifications);
router.patch('/notifications/:id/read', ctrl.markNotificationRead);
router.patch('/notifications/read-all', ctrl.markAllRead);
router.get('/bills', ctrl.getBills);
router.post('/bills/pay', ctrl.payBill);
router.post('/recharge', ctrl.rechargePhone);
router.get('/beneficiaries', ctrl.getBeneficiaries);
router.post('/beneficiaries', ctrl.addBeneficiary);
router.delete('/beneficiaries/:id', ctrl.deleteBeneficiary);
router.get('/savings-goals', ctrl.getSavingsGoals);
router.post('/savings-goals', ctrl.createSavingsGoal);
router.get('/loans', ctrl.getMyLoans);
router.post('/loans/apply', ctrl.applyLoan);
router.post('/kyc/upload', upload.single('file'), ctrl.uploadKycDoc);
router.get('/kyc/documents', ctrl.getKycDocuments);
router.get('/analytics', ctrl.getSpendingAnalytics);

module.exports = router;
