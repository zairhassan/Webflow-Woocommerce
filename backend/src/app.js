const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const authRoutes = require('./routes/auth.routes');
const adminProductRoutes = require('./routes/admin.product.routes');
const adminOrderRoutes = require('./routes/admin.order.routes');
const adminStoreRoutes = require('./routes/admin.store.routes');
const adminCategoryRoutes = require('./routes/admin.category.routes');
const adminCouponRoutes = require('./routes/admin.coupon.routes');
const adminCustomerRoutes = require('./routes/admin.customer.routes');
const adminShippingRoutes = require('./routes/admin.shipping.routes');
const adminTaxRoutes = require('./routes/admin.tax.routes');
const adminAnalyticsRoutes = require('./routes/admin.analytics.routes');
const customerRoutes = require('./routes/customer.routes');
const publicRoutes = require('./routes/public.routes');
const checkoutRoutes = require('./routes/checkout.routes');
const webhookRoutes = require('./routes/webhook.routes');
const adminPaymentRoutes = require('./routes/admin.payment.routes');
const publicPaymentRoutes = require('./routes/public.payment.routes');

const app = express();

// Request logger
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Security
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false
}));
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Store-Key']
}));

// Serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Webhook route needs raw body for Stripe signature verification
app.use('/api/v1/webhooks', express.raw({ type: 'application/json' }));

// Parse JSON for all other routes
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const publicLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 120,
    message: { error: 'Too many requests, please try again later.' }
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { error: 'Too many login attempts, please try again later.' }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', version: '2.0.0', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/v1/auth', authLimiter, authRoutes);
app.use('/api/v1/admin/products', adminProductRoutes);
app.use('/api/v1/admin/orders', adminOrderRoutes);
app.use('/api/v1/admin/store', adminStoreRoutes);
app.use('/api/v1/admin/catalog', adminCategoryRoutes);
app.use('/api/v1/admin/coupons', adminCouponRoutes);
app.use('/api/v1/admin/customers', adminCustomerRoutes);
app.use('/api/v1/admin/shipping', adminShippingRoutes);
app.use('/api/v1/admin/tax', adminTaxRoutes);
app.use('/api/v1/admin/analytics', adminAnalyticsRoutes);
app.use('/api/v1/customer', publicLimiter, customerRoutes);
app.use('/api/v1/public', publicLimiter, publicRoutes);
app.use('/api/v1/checkout', publicLimiter, checkoutRoutes);
app.use('/api/v1/webhooks', webhookRoutes);
app.use('/api/v1/admin/payments', adminPaymentRoutes);
app.use('/api/v1/public/payments', publicPaymentRoutes);

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Server Error:', err);
    res.status(err.status || 500).json({
        error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
    });
});

module.exports = app;
