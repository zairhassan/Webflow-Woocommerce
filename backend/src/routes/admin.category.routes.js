const router = require('express').Router();
const { authenticateAdmin } = require('../middleware/auth');
const ctrl = require('../controllers/category.controller');

router.use(authenticateAdmin);

// Categories
router.get('/categories', ctrl.listCategories);
router.post('/categories', ctrl.createCategory);
router.put('/categories/:id', ctrl.updateCategory);
router.delete('/categories/:id', ctrl.deleteCategory);

// Tags
router.get('/tags', ctrl.listTags);
router.post('/tags', ctrl.createTag);
router.delete('/tags/:id', ctrl.deleteTag);

module.exports = router;
