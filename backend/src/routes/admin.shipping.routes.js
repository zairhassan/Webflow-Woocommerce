const router = require('express').Router();
const { authenticateAdmin } = require('../middleware/auth');
const ctrl = require('../controllers/shipping.controller');

router.use(authenticateAdmin);

router.get('/', ctrl.listZones);
router.get('/:id', ctrl.getZone);
router.post('/', ctrl.createZone);
router.put('/:id', ctrl.updateZone);
router.delete('/:id', ctrl.deleteZone);

module.exports = router;
