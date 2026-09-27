const express = require('express');
const router = express.Router();
const transferController = require('../controllers/transferController');
const { authenticate, authorize } = require('../middleware/auth');
const { validateStockTransfer, validateIdParam, validatePagination } = require('../middleware/validation');

router.get('/', authenticate, validatePagination, transferController.getStockTransfers);
router.post('/', authenticate, authorize('Admin', 'Warehouse Manager', 'Staff'), validateStockTransfer, transferController.createStockTransfer);
router.put('/:id/approve', authenticate, authorize('Admin', 'Warehouse Manager'), validateIdParam, transferController.approveStockTransfer);
router.put('/:id/complete', authenticate, authorize('Admin', 'Warehouse Manager'), validateIdParam, transferController.completeStockTransfer);
router.put('/:id/cancel', authenticate, authorize('Admin', 'Warehouse Manager', 'Staff'), validateIdParam, transferController.cancelStockTransfer);

module.exports = router;