const router = require('express').Router();
const { authenticateAdmin } = require('../middleware/auth');
const ctrl = require('../controllers/coupon.controller');

router.use(authenticateAdmin);

router.get('/', ctrl.listCoupons);
router.get('/:id', ctrl.getCoupon);
router.post('/', ctrl.createCoupon);
router.put('/:id', ctrl.updateCoupon);
router.delete('/:id', ctrl.deleteCoupon);

module.exports = router;
