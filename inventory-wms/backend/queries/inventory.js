/**
 * ============================================================================
 * INVENTORY SQL QUERIES
 * ============================================================================
 * This file contains all SQL queries for managing Warehouse Inventory stock.
 * 
 * Concept:
 * The `inventory` table represents an M:N bridge between Products and Warehouses:
 * - Each row tracks how many units of `product_id` are in `warehouse_id`.
 * - `reorder_level`: Threshold quantity below which a replenishment alert is triggered.
 * - Stock status:
 *     - 'Out of Stock' : quantity_available = 0
 *     - 'Low Stock'    : quantity_available <= reorder_level
 *     - 'In Stock'     : quantity_available > reorder_level
 * ============================================================================
 */

const inventoryQueries = {
  /**
   * 1. Base query for listing inventory records with product, category, and warehouse details.
   * Includes a CASE expression that dynamically calculates the real-time stock status badge.
   */
  baseInventorySelect: `
    SELECT 
      i.inventory_id,
      i.warehouse_id,
      i.product_id,
      i.quantity_available,
      i.reserved_quantity,
      i.reorder_level,
      i.last_updated,
      p.sku,
      p.product_name,
      p.unit_price,
      p.selling_price,
      c.category_name,
      w.warehouse_name,
      CASE 
        WHEN i.quantity_available = 0 THEN 'Out of Stock'
        WHEN i.quantity_available <= i.reorder_level THEN 'Low Stock'
        ELSE 'In Stock'
      END AS stock_status
    FROM inventory i
    INNER JOIN products p ON i.product_id = p.product_id
    INNER JOIN categories c ON p.category_id = c.category_id
    INNER JOIN warehouses w ON i.warehouse_id = w.warehouse_id
  `,

  /**
   * 2. Find inventory records for a single product across all warehouses.
   * Parameter: [product_id]
   */
  findByProduct: `
    SELECT 
      i.inventory_id,
      i.warehouse_id,
      w.warehouse_name,
      w.location,
      i.quantity_available,
      i.reserved_quantity,
      i.reorder_level,
      i.last_updated,
      CASE 
        WHEN i.quantity_available = 0 THEN 'Out of Stock'
        WHEN i.quantity_available <= i.reorder_level THEN 'Low Stock'
        ELSE 'In Stock'
      END AS stock_status
    FROM inventory i
    INNER JOIN warehouses w ON i.warehouse_id = w.warehouse_id
    WHERE i.product_id = ? AND w.status = 'Active'
    ORDER BY w.warehouse_name ASC
  `,

  /**
   * 3. Find a specific product's inventory in a specific warehouse.
   * Parameters: [warehouse_id, product_id]
   */
  findByWarehouseAndProduct: `
    SELECT * 
    FROM inventory 
    WHERE warehouse_id = ? AND product_id = ?
  `,

  /**
   * 4. Call the AddStockIn stored procedure.
   * Handles ACID-compliant stock increase and logs a transaction record.
   * Parameters: [product_id, warehouse_id, quantity, user_id, reference_type, reference_id, remarks]
   */
  callStockIn: 'CALL AddStockIn(?, ?, ?, ?, ?, ?, ?, @success, @message)',

  /**
   * 5. Call the AddStockOut stored procedure.
   * Checks for sufficient stock, deducts inventory, and logs a transaction record.
   * Parameters: [product_id, warehouse_id, quantity, user_id, reference_type, reference_id, remarks]
   */
  callStockOut: 'CALL AddStockOut(?, ?, ?, ?, ?, ?, ?, @success, @message)',

  /**
   * 6. Retrieve stored procedure execution outcome.
   */
  getProcedureOutput: 'SELECT @success AS success, @message AS message'
};

module.exports = inventoryQueries;