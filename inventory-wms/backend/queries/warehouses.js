/**
 * ============================================================================
 * WAREHOUSES SQL QUERIES
 * ============================================================================
 * This file contains all SQL queries for managing Warehouses and Storage Locations.
 * 
 * Concept:
 * Warehouses store inventory stock items.
 * - Each warehouse has a designated Manager (Foreign Key: manager_id -> users.user_id)
 * - Warehouses have physical capacity limits (capacity in storage units)
 * - Stock utilization = (total_stock / capacity) * 100%
 * ============================================================================
 */

const warehouseQueries = {
  /**
   * 1. Base query for listing warehouses with manager name and real-time inventory counts.
   * Uses subqueries for product_count and total_stock to avoid row duplication.
   */
  baseWarehouseSelect: `
    SELECT 
      w.warehouse_id,
      w.warehouse_name,
      w.location,
      w.capacity,
      w.manager_id,
      w.contact_number,
      w.status,
      w.created_at,
      w.updated_at,
      u.full_name AS manager_name,
      u.email AS manager_email,
      (SELECT COUNT(*) FROM inventory i WHERE i.warehouse_id = w.warehouse_id) AS product_count,
      (SELECT COALESCE(SUM(i.quantity_available), 0) FROM inventory i WHERE i.warehouse_id = w.warehouse_id) AS total_stock
    FROM warehouses w
    LEFT JOIN users u ON w.manager_id = u.user_id
  `,

  /**
   * 2. Find a specific warehouse by its ID.
   * Parameter: [warehouse_id]
   */
  findById: `
    SELECT 
      w.warehouse_id,
      w.warehouse_name,
      w.location,
      w.capacity,
      w.manager_id,
      w.contact_number,
      w.status,
      w.created_at,
      w.updated_at,
      u.full_name AS manager_name,
      u.email AS manager_email,
      (SELECT COUNT(*) FROM inventory i WHERE i.warehouse_id = w.warehouse_id) AS product_count,
      (SELECT COALESCE(SUM(i.quantity_available), 0) FROM inventory i WHERE i.warehouse_id = w.warehouse_id) AS total_stock
    FROM warehouses w
    LEFT JOIN users u ON w.manager_id = u.user_id
    WHERE w.warehouse_id = ?
  `,

  /**
   * 3. Insert a new warehouse.
   * Parameters: [warehouse_name, location, capacity, manager_id, contact_number, status]
   */
  create: `
    INSERT INTO warehouses (
      warehouse_name, 
      location, 
      capacity, 
      manager_id, 
      contact_number, 
      status
    )
    VALUES (?, ?, ?, ?, ?, ?)
  `,

  /**
   * 4. Update an existing warehouse.
   * Parameters: [warehouse_name, location, capacity, manager_id, contact_number, status, warehouse_id]
   */
  update: `
    UPDATE warehouses 
    SET 
      warehouse_name = ?, 
      location = ?, 
      capacity = ?, 
      manager_id = ?, 
      contact_number = ?, 
      status = ?, 
      updated_at = CURRENT_TIMESTAMP
    WHERE warehouse_id = ?
  `,

  /**
   * 5. Check if warehouse has stock before deleting or deactivating.
   * Parameter: [warehouse_id]
   */
  checkStock: `
    SELECT COALESCE(SUM(quantity_available), 0) AS total_stock 
    FROM inventory 
    WHERE warehouse_id = ?
  `,

  /**
   * 6. Deactivate / soft delete warehouse.
   * Parameter: [warehouse_id]
   */
  delete: `
    UPDATE warehouses 
    SET status = 'Inactive', updated_at = CURRENT_TIMESTAMP 
    WHERE warehouse_id = ?
  `,

  /**
   * 7. Get users eligible to be assigned as warehouse managers (Admin or Warehouse Manager role).
   */
  getAvailableManagers: `
    SELECT 
      u.user_id, 
      u.full_name, 
      u.email, 
      r.role_name
    FROM users u
    INNER JOIN roles r ON u.role_id = r.role_id
    WHERE r.role_name IN ('Admin', 'Warehouse Manager') 
      AND u.is_active = TRUE
    ORDER BY u.full_name ASC
  `
};

module.exports = warehouseQueries;