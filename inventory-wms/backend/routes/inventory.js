const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
const { authenticate, authorize } = require('../middleware/auth');
const { validateStockTransaction, validateIdParam, validatePagination } = require('../middleware/validation');

router.get('/', authenticate, validatePagination, inventoryController.getInventory);
router.get('/warehouse/:id', authenticate, validateIdParam, validatePagination, inventoryController.getInventoryByWarehouse);
router.post('/stock-in', authenticate, authorize('Admin', 'Warehouse Manager', 'Staff'), validateStockTransaction, inventoryController.stockIn);
router.post('/stock-out', authenticate, authorize('Admin', 'Warehouse Manager', 'Staff'), validateStockTransaction, inventoryController.stockOut);
router.get('/transactions', authenticate, validatePagination, inventoryController.getStockTransactions);

module.exports = router;