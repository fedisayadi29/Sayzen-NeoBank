const router = require('express').Router();
const ctrl = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

router.post('/register', ctrl.register);
router.post('/login', ctrl.login);
router.get('/me', authenticate, ctrl.getMe);
router.post('/otp/send', authenticate, ctrl.sendOTP);
router.post('/otp/verify', authenticate, ctrl.verifyOTP);
router.put('/change-password', authenticate, ctrl.changePassword);

module.exports = router;
