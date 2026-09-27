const express = require('express');
const router = express.Router();
const supplierController = require('../controllers/supplierController');
const { authenticate, authorize } = require('../middleware/auth');
const { validateSupplier, validateIdParam, validatePagination } = require('../middleware/validation');

router.get('/', authenticate, validatePagination, supplierController.getSuppliers);
router.get('/:id', authenticate, validateIdParam, supplierController.getSupplierById);
router.post('/', authenticate, authorize('Admin', 'Warehouse Manager'), validateSupplier, supplierController.createSupplier);
router.put('/:id', authenticate, authorize('Admin', 'Warehouse Manager'), validateIdParam, validateSupplier, supplierController.updateSupplier);
router.delete('/:id', authenticate, authorize('Admin'), validateIdParam, supplierController.deleteSupplier);

module.exports = router;