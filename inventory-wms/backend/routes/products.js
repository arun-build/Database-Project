const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { authenticate, authorize } = require('../middleware/auth');
const { validateProduct, validateIdParam, validatePagination } = require('../middleware/validation');

router.get('/', authenticate, validatePagination, productController.getProducts);
router.get('/:id', authenticate, validateIdParam, productController.getProductById);
router.post('/', authenticate, authorize('Admin', 'Warehouse Manager'), validateProduct, productController.createProduct);
router.put('/:id', authenticate, authorize('Admin', 'Warehouse Manager'), validateIdParam, validateProduct, productController.updateProduct);
router.delete('/:id', authenticate, authorize('Admin'), validateIdParam, productController.deleteProduct);

module.exports = router;