const router = require('express').Router();
const { listOrders, getOrder, updateOrderStatus, getStats } = require('../controllers/order.controller');
const { authenticateAdmin } = require('../middleware/auth');

router.use(authenticateAdmin);

router.get('/stats', getStats);
router.get('/', listOrders);
router.get('/:id', getOrder);
router.patch('/:id/status', updateOrderStatus);

module.exports = router;
