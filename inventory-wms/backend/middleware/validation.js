const { body, param, query, validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

const validateRegister = [
  body('full_name').trim().notEmpty().withMessage('Full name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Full name must be between 2 and 100 characters'),
  body('email').isEmail().withMessage('Valid email is required')
    .normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
    .matches(/\d/).withMessage('Password must contain at least one number'),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error('Passwords do not match');
    }
    return true;
  }),
  handleValidationErrors
];

const validateLogin = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
  handleValidationErrors
];

const validateProduct = [
  body('sku').trim().notEmpty().withMessage('SKU is required')
    .isLength({ max: 50 }).withMessage('SKU must not exceed 50 characters'),
  body('product_name').trim().notEmpty().withMessage('Product name is required')
    .isLength({ max: 200 }).withMessage('Product name must not exceed 200 characters'),
  body('category_id').isInt({ min: 1 }).withMessage('Valid category is required'),
  body('supplier_id').isInt({ min: 1 }).withMessage('Valid supplier is required'),
  body('unit_price').isFloat({ min: 0 }).withMessage('Unit price must be a positive number'),
  body('selling_price').isFloat({ min: 0 }).withMessage('Selling price must be a positive number'),
  body('reorder_level').isInt({ min: 0 }).withMessage('Reorder level must be a non-negative integer'),
  body('unit_type').trim().notEmpty().withMessage('Unit type is required')
    .isLength({ max: 20 }).withMessage('Unit type must not exceed 20 characters'),
  handleValidationErrors
];

const validateCategory = [
  body('category_name').trim().notEmpty().withMessage('Category name is required')
    .isLength({ max: 100 }).withMessage('Category name must not exceed 100 characters'),
  handleValidationErrors
];

const validateWarehouse = [
  body('warehouse_name').trim().notEmpty().withMessage('Warehouse name is required')
    .isLength({ max: 100 }).withMessage('Warehouse name must not exceed 100 characters'),
  body('location').trim().notEmpty().withMessage('Location is required')
    .isLength({ max: 255 }).withMessage('Location must not exceed 255 characters'),
  body('capacity').isInt({ min: 1 }).withMessage('Capacity must be a positive integer'),
  body('contact_number').optional().trim().isLength({ max: 20 }).withMessage('Contact number must not exceed 20 characters'),
  handleValidationErrors
];

const validateSupplier = [
  body('supplier_name').trim().notEmpty().withMessage('Supplier name is required')
    .isLength({ max: 150 }).withMessage('Supplier name must not exceed 150 characters'),
  body('contact_person').optional().trim().isLength({ max: 100 }).withMessage('Contact person must not exceed 100 characters'),
  body('email').optional().isEmail().withMessage('Valid email required').normalizeEmail(),
  body('phone').optional().trim().isLength({ max: 20 }).withMessage('Phone must not exceed 20 characters'),
  body('address').optional().trim(),
  body('gst_number').optional().trim().isLength({ max: 50 }).withMessage('GST number must not exceed 50 characters'),
  handleValidationErrors
];

const validateStockTransaction = [
  body('product_id').isInt({ min: 1 }).withMessage('Valid product is required'),
  body('warehouse_id').isInt({ min: 1 }).withMessage('Valid warehouse is required'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
  body('reference_type').isIn(['PURCHASE_ORDER', 'STOCK_TRANSFER', 'MANUAL', 'RETURN', 'ADJUSTMENT']).withMessage('Invalid reference type'),
  body('reference_id').optional().isInt({ min: 1 }),
  body('remarks').optional().trim(),
  handleValidationErrors
];

const validatePurchaseOrder = [
  body('supplier_id').isInt({ min: 1 }).withMessage('Valid supplier is required'),
  body('order_date').isISO8601().withMessage('Valid order date is required'),
  body('expected_delivery_date').optional().isISO8601().withMessage('Valid delivery date required'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.product_id').isInt({ min: 1 }).withMessage('Valid product is required'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
  body('items.*.unit_price').isFloat({ min: 0 }).withMessage('Unit price must be a positive number'),
  handleValidationErrors
];

const validateStockTransfer = [
  body('product_id').isInt({ min: 1 }).withMessage('Valid product is required'),
  body('source_warehouse_id').isInt({ min: 1 }).withMessage('Valid source warehouse is required'),
  body('destination_warehouse_id').isInt({ min: 1 }).withMessage('Valid destination warehouse is required'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
  body('remarks').optional().trim(),
  handleValidationErrors
];

const validateIdParam = [
  param('id').isInt({ min: 1 }).withMessage('Valid ID is required'),
  handleValidationErrors
];

const validatePagination = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('search').optional().trim(),
  query('sort_by').optional().trim(),
  query('sort_order').optional().isIn(['ASC', 'DESC']).withMessage('Sort order must be ASC or DESC'),
  handleValidationErrors
];

module.exports = {
  validateRegister,
  validateLogin,
  validateProduct,
  validateCategory,
  validateWarehouse,
  validateSupplier,
  validateStockTransaction,
  validatePurchaseOrder,
  validateStockTransfer,
  validateIdParam,
  validatePagination,
  handleValidationErrors
};