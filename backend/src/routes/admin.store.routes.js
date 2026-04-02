const router = require('express').Router();
const { getSettings, updateSettings, testSmtp } = require('../controllers/store.controller');
const { authenticateAdmin } = require('../middleware/auth');

router.use(authenticateAdmin);

router.get('/settings', getSettings);
router.patch('/settings', updateSettings);
router.post('/smtp/test', testSmtp);

module.exports = router;
