const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticate, authorize } = require('../middleware/auth');
const { validatePagination } = require('../middleware/validation');

router.get('/dashboard/stats', authenticate, reportController.getDashboardStats);
router.get('/dashboard/charts', authenticate, reportController.getDashboardCharts);
router.get('/low-stock', authenticate, validatePagination, reportController.getLowStockReport);
router.get('/inventory-value', authenticate, validatePagination, reportController.getInventoryValueReport);
router.get('/transactions', authenticate, validatePagination, reportController.getTransactionReport);
router.get('/purchase-orders', authenticate, validatePagination, reportController.getPurchaseOrderReport);
router.get('/inventory-summary', authenticate, validatePagination, reportController.getInventorySummaryReport);
router.get('/export', authenticate, reportController.exportReport);

module.exports = router;