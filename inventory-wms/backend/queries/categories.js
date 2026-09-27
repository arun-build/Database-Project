/**
 * ============================================================================
 * CATEGORIES SQL QUERIES
 * ============================================================================
 * This file contains all SQL queries related to Product Categories.
 * 
 * Concept:
 * Categories group products together (e.g. 'Electronics', 'Furniture').
 * Each product belongs to one category (Foreign Key: products.category_id).
 * ============================================================================
 */

const categoryQueries = {
  /**
   * 1. Get all categories with the count of active products in each.
   * 
   * Tables:
   *   - categories c (primary table)
   *   - products p (joined to count how many active products belong to each category)
   */
  findAllWithProductCount: `
    SELECT 
      c.category_id,
      c.category_name,
      c.description,
      c.created_at,
      COUNT(p.product_id) AS product_count
    FROM categories c
    LEFT JOIN products p 
      ON c.category_id = p.category_id 
      AND p.status != 'Discontinued'
    GROUP BY c.category_id, c.category_name, c.description, c.created_at
    ORDER BY c.category_name ASC
  `,

  /**
   * 2. Find a single category by its ID (Primary Key).
   * Parameter: [category_id]
   */
  findById: `
    SELECT 
      c.category_id,
      c.category_name,
      c.description,
      c.created_at,
      COUNT(p.product_id) AS product_count
    FROM categories c
    LEFT JOIN products p 
      ON c.category_id = p.category_id 
      AND p.status != 'Discontinued'
    WHERE c.category_id = ?
    GROUP BY c.category_id, c.category_name, c.description, c.created_at
  `,

  /**
   * 3. Check if a category name already exists (used to avoid duplicate names).
   * Parameter: [category_name]
   */
  findByName: `
    SELECT category_id, category_name 
    FROM categories 
    WHERE category_name = ?
  `,

  /**
   * 4. Insert a new category.
   * Parameters: [category_name, description]
   */
  create: `
    INSERT INTO categories (category_name, description) 
    VALUES (?, ?)
  `,

  /**
   * 5. Update an existing category by its ID.
   * Parameters: [category_name, description, category_id]
   */
  update: `
    UPDATE categories 
    SET 
      category_name = ?, 
      description = ?, 
      updated_at = CURRENT_TIMESTAMP
    WHERE category_id = ?
  `,

  /**
   * 6. Check if any active products are currently using this category.
   * Parameter: [category_id]
   */
  checkProductsInCategory: `
    SELECT COUNT(*) AS count 
    FROM products 
    WHERE category_id = ? AND status != 'Discontinued'
  `,

  /**
   * 7. Delete a category by its ID.
   * Parameter: [category_id]
   */
  delete: `
    DELETE FROM categories 
    WHERE category_id = ?
  `
};

module.exports = categoryQueries;