const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/userController');

router.use(authenticate);

// These are supplementary routes not in account.js
router.get('/access-logs', ctrl.getAccessLogs);

module.exports = router;
