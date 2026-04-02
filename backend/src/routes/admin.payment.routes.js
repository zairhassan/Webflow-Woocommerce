const express = require('express');
const router = express.Router();
const paymentCtrl = require('../controllers/admin.payment.controller');
const { authenticateAdmin } = require('../middleware/auth');

router.use(authenticateAdmin);

router.get('/', paymentCtrl.getGateways);
router.put('/:provider', paymentCtrl.updateGateway);

module.exports = router;
