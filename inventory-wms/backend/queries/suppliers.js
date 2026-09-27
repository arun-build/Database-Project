/**
 * ============================================================================
 * SUPPLIERS SQL QUERIES
 * ============================================================================
 * This file contains all SQL queries for managing Suppliers / Vendors.
 * 
 * Concept:
 * Suppliers provide products and fulfill Purchase Orders.
 * - Each supplier can provide multiple products (Foreign Key: products.supplier_id)
 * - Each supplier can have multiple Purchase Orders (Foreign Key: purchase_orders.supplier_id)
 * ============================================================================
 */

const supplierQueries = {
  /**
   * 1. Base query for listing suppliers with their product count and purchase order count.
   */
  baseSupplierSelect: `
    SELECT 
      s.supplier_id,
      s.supplier_name,
      s.contact_person,
      s.email,
      s.phone,
      s.address,
      s.gst_number,
      s.status,
      s.created_at,
      s.updated_at,
      (SELECT COUNT(*) 
       FROM products p 
       WHERE p.supplier_id = s.supplier_id AND p.status != 'Discontinued') AS product_count,
      (SELECT COUNT(*) 
       FROM purchase_orders po 
       WHERE po.supplier_id = s.supplier_id) AS total_orders
    FROM suppliers s
  `,

  /**
   * 2. Find a specific supplier by ID.
   * Parameter: [supplier_id]
   */
  findById: `
    SELECT 
      s.supplier_id,
      s.supplier_name,
      s.contact_person,
      s.email,
      s.phone,
      s.address,
      s.gst_number,
      s.status,
      s.created_at,
      s.updated_at,
      (SELECT COUNT(*) 
       FROM products p 
       WHERE p.supplier_id = s.supplier_id AND p.status != 'Discontinued') AS product_count,
      (SELECT COUNT(*) 
       FROM purchase_orders po 
       WHERE po.supplier_id = s.supplier_id) AS total_orders
    FROM suppliers s
    WHERE s.supplier_id = ?
  `,

  /**
   * 3. Insert a new supplier.
   * Parameters: [supplier_name, contact_person, email, phone, address, gst_number, status]
   */
  create: `
    INSERT INTO suppliers (
      supplier_name, 
      contact_person, 
      email, 
      phone, 
      address, 
      gst_number, 
      status
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `,

  /**
   * 4. Update an existing supplier.
   * Parameters: [supplier_name, contact_person, email, phone, address, gst_number, status, supplier_id]
   */
  update: `
    UPDATE suppliers 
    SET 
      supplier_name = ?, 
      contact_person = ?, 
      email = ?, 
      phone = ?, 
      address = ?, 
      gst_number = ?, 
      status = ?, 
      updated_at = CURRENT_TIMESTAMP
    WHERE supplier_id = ?
  `,

  /**
   * 5. Check if supplier has active products before deleting.
   * Parameter: [supplier_id]
   */
  checkProducts: `
    SELECT COUNT(*) AS count 
    FROM products 
    WHERE supplier_id = ? AND status != 'Discontinued'
  `,

  /**
   * 6. Deactivate / soft delete supplier.
   * Parameter: [supplier_id]
   */
  delete: `
    UPDATE suppliers 
    SET status = 'Inactive', updated_at = CURRENT_TIMESTAMP 
    WHERE supplier_id = ?
  `
};

module.exports = supplierQueries;