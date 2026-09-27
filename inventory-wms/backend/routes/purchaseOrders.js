const express = require('express');
const router = express.Router();
const purchaseOrderController = require('../controllers/purchaseOrderController');
const { authenticate, authorize } = require('../middleware/auth');
const { validatePurchaseOrder, validateIdParam, validatePagination } = require('../middleware/validation');

router.get('/', authenticate, validatePagination, purchaseOrderController.getPurchaseOrders);
router.get('/:id', authenticate, validateIdParam, purchaseOrderController.getPurchaseOrderById);
router.post('/', authenticate, authorize('Admin', 'Warehouse Manager'), validatePurchaseOrder, purchaseOrderController.createPurchaseOrder);
router.put('/:id/status', authenticate, authorize('Admin', 'Warehouse Manager'), validateIdParam, purchaseOrderController.updatePurchaseOrderStatus);

module.exports = router;