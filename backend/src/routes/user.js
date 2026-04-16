const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/userController');

router.use(authenticate);

router.get('/profile', ctrl.getProfile);
router.put('/profile', ctrl.updateProfile);
router.get('/profile/change-requests', ctrl.getChangeRequests);
router.get('/analytics', ctrl.getAnalytics);
router.get('/access-logs', ctrl.getAccessLogs);

module.exports = router;