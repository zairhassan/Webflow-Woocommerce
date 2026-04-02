const router = require('express').Router();
const { authenticateAdmin } = require('../middleware/auth');
const ctrl = require('../controllers/analytics.controller');

router.use(authenticateAdmin);

router.get('/overview', ctrl.getOverview);
router.get('/revenue-chart', ctrl.getRevenueChart);
router.get('/top-products', ctrl.getTopProducts);
router.get('/recent-orders', ctrl.getRecentOrders);
router.get('/order-status', ctrl.getOrderStatusBreakdown);

module.exports = router;
