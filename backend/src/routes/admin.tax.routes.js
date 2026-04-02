const router = require('express').Router();
const { authenticateAdmin } = require('../middleware/auth');
const ctrl = require('../controllers/tax.controller');

router.use(authenticateAdmin);

router.get('/', ctrl.listTaxRates);
router.get('/:id', ctrl.getTaxRate);
router.post('/', ctrl.createTaxRate);
router.put('/:id', ctrl.updateTaxRate);
router.delete('/:id', ctrl.deleteTaxRate);

module.exports = router;
