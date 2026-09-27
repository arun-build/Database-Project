const express = require('express');
const router = express.Router();
const warehouseController = require('../controllers/warehouseController');
const { authenticate, authorize } = require('../middleware/auth');
const { validateWarehouse, validateIdParam, validatePagination } = require('../middleware/validation');

router.get('/', authenticate, validatePagination, warehouseController.getWarehouses);
router.get('/:id', authenticate, validateIdParam, warehouseController.getWarehouseById);
router.post('/', authenticate, authorize('Admin'), validateWarehouse, warehouseController.createWarehouse);
router.put('/:id', authenticate, authorize('Admin'), validateIdParam, validateWarehouse, warehouseController.updateWarehouse);
router.delete('/:id', authenticate, authorize('Admin'), validateIdParam, warehouseController.deleteWarehouse);

module.exports = router;