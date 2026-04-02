const express = require('express');
const router = express.Router();
const paymentCtrl = require('../controllers/admin.payment.controller');
const { authenticatePublicKey } = require('../middleware/auth');

router.get('/active', authenticatePublicKey, paymentCtrl.getActiveGateways);

module.exports = router;
