const router = require('express').Router();
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const { authenticatePublicKey } = require('../middleware/auth');
const customerCtrl = require('../controllers/customer.controller');
const couponCtrl = require('../controllers/coupon.controller');
const wishlistCtrl = require('../controllers/wishlist.controller');

// Customer auth middleware
const authenticateCustomer = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (decoded.type !== 'customer') {
            return res.status(401).json({ error: 'Invalid token type' });
        }

        req.customerId = decoded.customerId;
        req.storeId = decoded.storeId;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};

// Public (needs store key)
router.use(authenticatePublicKey);

// Customer Auth
router.post('/register', customerCtrl.register);
router.post('/login', customerCtrl.login);
router.post('/forgot-password', customerCtrl.forgotPassword);
router.post('/reset-password', customerCtrl.resetPassword);

// Coupon validation (public)
router.post('/coupons/validate', couponCtrl.validateCoupon);

// Protected customer routes
router.get('/profile', authenticateCustomer, customerCtrl.getProfile);
router.put('/profile', authenticateCustomer, customerCtrl.updateProfile);
router.put('/profile/password', authenticateCustomer, customerCtrl.changePassword);

// Addresses
router.get('/addresses', authenticateCustomer, customerCtrl.listAddresses);
router.post('/addresses', authenticateCustomer, customerCtrl.addAddress);
router.put('/addresses/:id', authenticateCustomer, customerCtrl.updateAddress);
router.delete('/addresses/:id', authenticateCustomer, customerCtrl.deleteAddress);

// Order History
router.get('/orders', authenticateCustomer, customerCtrl.getOrders);

// Wishlist
router.get('/wishlist', authenticateCustomer, wishlistCtrl.getWishlist);
router.post('/wishlist', authenticateCustomer, wishlistCtrl.addToWishlist);
router.post('/wishlist/check', authenticateCustomer, wishlistCtrl.checkWishlist);
router.delete('/wishlist/:productId', authenticateCustomer, wishlistCtrl.removeFromWishlist);

// Product Reviews
router.post('/reviews', authenticateCustomer, customerCtrl.addReview);

module.exports = router;
