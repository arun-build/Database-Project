/**
 * ============================================================================
 * STOCK TRANSACTIONS SQL QUERIES (Audit Log)
 * ============================================================================
 * This file contains all SQL queries for the immutable stock movement audit ledger.
 * 
 * Concept:
 * Every stock addition, deduction, or transfer logs an immutable record in `stock_transactions`:
 * - `transaction_type`: 'STOCK_IN', 'STOCK_OUT'
 * - `reference_type`: 'PURCHASE_ORDER', 'STOCK_TRANSFER', 'MANUAL', 'ADJUSTMENT'
 * - Tracks exactly WHO made the change and WHEN.
 * ============================================================================
 */

const stockTransactionQueries = {
  /**
   * 1. Base query for listing stock transaction logs.
   * Joins:
   *   - products p (SKU and product name)
   *   - warehouses w (warehouse where transaction occurred)
   *   - users u (user who authorized or performed the transaction)
   */
  baseTransactionSelect: `
    SELECT 
      st.transaction_id,
      st.product_id,
      p.sku,
      p.product_name,
      st.warehouse_id,
      w.warehouse_name,
      st.transaction_type,
      st.quantity,
      st.reference_type,
      st.reference_id,
      st.performed_by,
      u.full_name AS performed_by,
      st.transaction_date,
      st.remarks
    FROM stock_transactions st
    INNER JOIN products p ON st.product_id = p.product_id
    INNER JOIN warehouses w ON st.warehouse_id = w.warehouse_id
    INNER JOIN users u ON st.performed_by = u.user_id
  `,

  /**
   * 2. Find transaction history for a specific product.
   * Parameter: [product_id]
   */
  findByProduct: `
    SELECT 
      st.transaction_id,
      st.product_id,
      p.sku,
      p.product_name,
      st.warehouse_id,
      w.warehouse_name,
      st.transaction_type,
      st.quantity,
      st.reference_type,
      st.reference_id,
      u.full_name AS performed_by,
      st.transaction_date,
      st.remarks
    FROM stock_transactions st
    INNER JOIN products p ON st.product_id = p.product_id
    INNER JOIN warehouses w ON st.warehouse_id = w.warehouse_id
    INNER JOIN users u ON st.performed_by = u.user_id
    WHERE st.product_id = ?
    ORDER BY st.transaction_date DESC
  `,

  /**
   * 3. Find transaction history for a specific warehouse.
   * Parameter: [warehouse_id]
   */
  findByWarehouse: `
    SELECT 
      st.transaction_id,
      st.product_id,
      p.sku,
      p.product_name,
      st.warehouse_id,
      w.warehouse_name,
      st.transaction_type,
      st.quantity,
      st.reference_type,
      st.reference_id,
      u.full_name AS performed_by,
      st.transaction_date,
      st.remarks
    FROM stock_transactions st
    INNER JOIN products p ON st.product_id = p.product_id
    INNER JOIN warehouses w ON st.warehouse_id = w.warehouse_id
    INNER JOIN users u ON st.performed_by = u.user_id
    WHERE st.warehouse_id = ?
    ORDER BY st.transaction_date DESC
  `
};

module.exports = stockTransactionQueries;