const router = require('express').Router();
const { createCheckoutSession, createPaymentIntent } = require('../controllers/checkout.controller');
const { authenticatePublicKey } = require('../middleware/auth');

router.post('/create-session', authenticatePublicKey, createCheckoutSession);
router.post('/create-payment-intent', authenticatePublicKey, createPaymentIntent);

module.exports = router;
