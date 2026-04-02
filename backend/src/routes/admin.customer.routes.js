const router = require('express').Router();
const { authenticateAdmin } = require('../middleware/auth');
const ctrl = require('../controllers/customer.controller');

router.use(authenticateAdmin);

router.get('/', ctrl.listCustomers);
router.get('/:id', ctrl.getCustomerDetail);

module.exports = router;
