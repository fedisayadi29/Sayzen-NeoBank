const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const multer = require('multer');
const path   = require('path');
const fs     = require('fs');
const ctrl   = require('../controllers/accountController');

// Ensure uploads directory exists
const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads', 'kyc');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext  = path.extname(file.originalname) || '.jpg';
    const name = `${req.user?.id || 'unknown'}_${Date.now()}${ext}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|pdf/i;
    cb(null, allowed.test(path.extname(file.originalname)) || allowed.test(file.mimetype));
  },
});

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
