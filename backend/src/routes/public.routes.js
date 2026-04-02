const router = require('express').Router();
const { getProducts, getProductBySlug, validateCart, getCategories, searchProducts, getStorePublicInfo } = require('../controllers/public.controller');
const { authenticatePublicKey } = require('../middleware/auth');

router.use(authenticatePublicKey);

router.get('/products', getProducts);
router.get('/products/:slug', getProductBySlug);
router.get('/categories', getCategories);
router.get('/search', searchProducts);
router.get('/store-info', getStorePublicInfo);
router.post('/cart/validate', validateCart);

module.exports = router;
