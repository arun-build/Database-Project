const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { authenticate, authorize } = require('../middleware/auth');
const { validateCategory, validateIdParam, validatePagination } = require('../middleware/validation');

router.get('/', authenticate, validatePagination, categoryController.getCategories);
router.post('/', authenticate, authorize('Admin', 'Warehouse Manager'), validateCategory, categoryController.createCategory);
router.put('/:id', authenticate, authorize('Admin', 'Warehouse Manager'), validateIdParam, validateCategory, categoryController.updateCategory);
router.delete('/:id', authenticate, authorize('Admin'), validateIdParam, categoryController.deleteCategory);

module.exports = router;