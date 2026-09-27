/**
 * ============================================================================
 * PRODUCTS SQL QUERIES
 * ============================================================================
 * This file contains all SQL queries for managing Products.
 * 
 * Concept:
 * Products are inventory items tracked across warehouses.
 * - Each product belongs to a Category (Foreign Key: category_id -> categories)
 * - Each product is supplied by a Supplier (Foreign Key: supplier_id -> suppliers)
 * - Products have a unique SKU (Stock Keeping Unit) identifier.
 * ============================================================================
 */

const productQueries = {
  /**
   * 1. Base SELECT for products joined with their category and supplier names.
   * Joins:
   *   - categories c ON p.category_id = c.category_id (to get category_name)
   *   - suppliers s ON p.supplier_id = s.supplier_id (to get supplier_name)
   */
  baseProductSelect: `
    SELECT 
      p.product_id,
      p.sku,
      p.product_name,
      p.description,
      p.category_id,
      c.category_name,
      p.supplier_id,
      s.supplier_name,
      p.unit_price,
      p.selling_price,
      p.reorder_level,
      p.unit_type,
      p.status,
      p.created_at,
      p.updated_at
    FROM products p
    INNER JOIN categories c ON p.category_id = c.category_id
    INNER JOIN suppliers s ON p.supplier_id = s.supplier_id
  `,

  /**
   * 2. Find a single product by its Product ID (Primary Key).
   * Parameter: [product_id]
   */
  findById: `
    SELECT 
      p.product_id,
      p.sku,
      p.product_name,
      p.description,
      p.category_id,
      c.category_name,
      p.supplier_id,
      s.supplier_name,
      p.unit_price,
      p.selling_price,
      p.reorder_level,
      p.unit_type,
      p.status,
      p.created_at,
      p.updated_at
    FROM products p
    INNER JOIN categories c ON p.category_id = c.category_id
    INNER JOIN suppliers s ON p.supplier_id = s.supplier_id
    WHERE p.product_id = ?
  `,

  /**
   * 3. Find a product by its unique SKU code.
   * Parameter: [sku]
   */
  findBySku: `
    SELECT product_id, sku, product_name 
    FROM products 
    WHERE sku = ?
  `,

  /**
   * 4. Insert a new product into the catalog.
   * Parameters: [sku, product_name, description, category_id, supplier_id, unit_price, selling_price, reorder_level, unit_type, status]
   */
  create: `
    INSERT INTO products (
      sku, 
      product_name, 
      description, 
      category_id, 
      supplier_id, 
      unit_price, 
      selling_price, 
      reorder_level, 
      unit_type, 
      status
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,

  /**
   * 5. Update an existing product's details.
   * Parameters: [product_name, description, category_id, supplier_id, unit_price, selling_price, reorder_level, unit_type, status, product_id]
   */
  update: `
    UPDATE products 
    SET 
      product_name = ?, 
      description = ?, 
      category_id = ?, 
      supplier_id = ?, 
      unit_price = ?, 
      selling_price = ?, 
      reorder_level = ?, 
      unit_type = ?, 
      status = ?, 
      updated_at = CURRENT_TIMESTAMP
    WHERE product_id = ?
  `,

  /**
   * 6. Check if product has available stock before allowing deletion.
   * Parameter: [product_id]
   */
  checkExistingStock: `
    SELECT COUNT(*) AS count 
    FROM inventory 
    WHERE product_id = ? AND quantity_available > 0
  `,

  /**
   * 7. Soft delete a product (set status to 'Discontinued').
   * In enterprise databases, soft deletes preserve historical stock and PO records.
   * Parameter: [product_id]
   */
  softDelete: `
    UPDATE products 
    SET status = 'Discontinued', updated_at = CURRENT_TIMESTAMP 
    WHERE product_id = ?
  `,

  /**
   * 8. Hard delete a product (only if no inventory records exist).
   * Parameter: [product_id]
   */
  delete: `
    DELETE FROM products 
    WHERE product_id = ?
  `
};

module.exports = productQueries;