/**
 * Reports & Analytics SQL Queries
 * 
 * DBMS Concepts Illustrated:
 * - Complex Aggregations: SUM(), COUNT(), ROUND(), COALESCE()
 * - Group By Multi-column functional dependencies (MySQL 8 only_full_group_by compatible)
 * - Database Views usage: `low_stock_view`, `inventory_value_view`, `product_transaction_view`, `monthly_purchase_trends`
 * - Temporal date arithmetic: DATE_SUB, CURDATE, INTERVAL
 */

const reportQueries = {
  /**
   * Procedure call for primary dashboard KPI metrics
   */
  callDashboardStats: 'CALL GetDashboardStats()',

  /**
   * Fallback KPI query if stored procedure is not initialized
   */
  getDashboardStats: `
    SELECT 
      (SELECT COUNT(*) FROM products WHERE status = 'Active') AS total_products,
      (SELECT COUNT(*) FROM warehouses WHERE status = 'Active') AS total_warehouses,
      (SELECT COALESCE(SUM(quantity_available), 0) FROM inventory) AS total_stock,
      (SELECT COUNT(*) FROM low_stock_view WHERE stock_status = 'Low Stock') AS low_stock_products,
      (SELECT COUNT(*) FROM low_stock_view WHERE stock_status = 'Out of Stock') AS out_of_stock_products,
      (SELECT COUNT(*) FROM suppliers WHERE status = 'Active') AS total_suppliers,
      (SELECT COUNT(*) FROM purchase_orders WHERE status = 'Pending') AS pending_purchase_orders,
      (SELECT COALESCE(SUM(i.quantity_available * p.unit_price), 0) 
       FROM inventory i 
       JOIN products p ON i.product_id = p.product_id 
       WHERE p.status = 'Active') AS inventory_value
  `,

  /**
   * Recent audit trail of stock movements (Stock In, Stock Out, Transfers)
   */
  getRecentTransactions: `
    SELECT 
      st.*, 
      p.sku, 
      p.product_name, 
      w.warehouse_name, 
      u.full_name AS performed_by
    FROM stock_transactions st
    INNER JOIN products p ON st.product_id = p.product_id
    INNER JOIN warehouses w ON st.warehouse_id = w.warehouse_id
    INNER JOIN users u ON st.performed_by = u.user_id
    ORDER BY st.transaction_date DESC
    LIMIT 10
  `,

  /**
   * Critical inventory items needing replenishment
   */
  getLowStockAlerts: `
    SELECT * 
    FROM low_stock_view 
    ORDER BY stock_deficit ASC 
    LIMIT 10
  `,

  /**
   * Pending purchase orders awaiting approval or delivery
   */
  getPendingPurchaseOrders: `
    SELECT 
      po.*, 
      s.supplier_name
    FROM purchase_orders po
    INNER JOIN suppliers s ON po.supplier_id = s.supplier_id
    WHERE po.status = 'Pending'
    ORDER BY po.order_date DESC
    LIMIT 5
  `,

  /**
   * Time series data comparing daily stock intake vs outgoing shipments
   */
  getStockInOutChart: `
    SELECT 
      DATE(transaction_date) AS date,
      SUM(CASE WHEN transaction_type = 'STOCK_IN' THEN quantity ELSE 0 END) AS stock_in,
      SUM(CASE WHEN transaction_type = 'STOCK_OUT' THEN quantity ELSE 0 END) AS stock_out
    FROM stock_transactions
    WHERE transaction_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
    GROUP BY DATE(transaction_date)
    ORDER BY DATE(transaction_date) ASC
  `,

  /**
   * Category breakdown showing stock distribution by product classification
   */
  getInventoryByCategory: `
    SELECT 
      c.category_id,
      c.category_name,
      COALESCE(SUM(i.quantity_available), 0) AS total_quantity,
      COUNT(DISTINCT p.product_id) AS product_count
    FROM categories c
    LEFT JOIN products p ON c.category_id = p.category_id AND p.status = 'Active'
    LEFT JOIN inventory i ON p.product_id = i.product_id
    GROUP BY c.category_id, c.category_name
    ORDER BY total_quantity DESC
  `,

  /**
   * Warehouse capacity and stock volume distribution
   */
  getWarehouseStockDistribution: `
    SELECT 
      w.warehouse_id,
      w.warehouse_name,
      COALESCE(SUM(i.quantity_available), 0) AS total_stock,
      COALESCE(SUM(i.quantity_available * p.unit_price), 0) AS stock_value
    FROM warehouses w
    LEFT JOIN inventory i ON w.warehouse_id = i.warehouse_id
    LEFT JOIN products p ON i.product_id = p.product_id AND p.status = 'Active'
    WHERE w.status = 'Active'
    GROUP BY w.warehouse_id, w.warehouse_name
    ORDER BY total_stock DESC
  `,

  /**
   * 12-month purchase order volume and spending trend
   * Explicitly includes MONTHNAME in GROUP BY to comply with MySQL only_full_group_by mode
   */
  getMonthlyPurchaseTrends: `
    SELECT 
      YEAR(order_date) AS year, 
      MONTH(order_date) AS month, 
      MONTHNAME(order_date) AS month_name,
      COUNT(DISTINCT po_id) AS total_orders,
      COALESCE(SUM(total_amount), 0) AS total_amount,
      COUNT(DISTINCT supplier_id) AS unique_suppliers
    FROM purchase_orders
    WHERE status IN ('Approved', 'Received')
      AND order_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
    GROUP BY YEAR(order_date), MONTH(order_date), MONTHNAME(order_date)
    ORDER BY YEAR(order_date) DESC, MONTH(order_date) DESC
  `,

  /**
   * Complete inventory listing with calculated stock status and valuation
   */
  getInventorySummary: `
    SELECT 
      p.sku, 
      p.product_name, 
      c.category_name, 
      w.warehouse_name, 
      i.quantity_available, 
      i.reorder_level,
      CASE 
        WHEN i.quantity_available = 0 THEN 'Out of Stock'
        WHEN i.quantity_available <= i.reorder_level THEN 'Low Stock'
        ELSE 'In Stock'
      END AS stock_status,
      p.unit_price, 
      (i.quantity_available * p.unit_price) AS stock_value
    FROM inventory i
    INNER JOIN products p ON i.product_id = p.product_id
    INNER JOIN categories c ON p.category_id = c.category_id
    INNER JOIN warehouses w ON i.warehouse_id = w.warehouse_id
  `
};

module.exports = reportQueries;