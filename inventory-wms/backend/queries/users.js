/**
 * ============================================================================
 * USERS SQL QUERIES
 * ============================================================================
 * This file contains all SQL queries for User Management and Role Assignments.
 * 
 * Concept:
 * Users have assigned Roles (Admin, Warehouse Manager, Staff).
 * - Admin: full system access
 * - Warehouse Manager: manages inventory and warehouses
 * - Staff: operational duties at an assigned warehouse (Foreign Key: warehouse_id)
 * ============================================================================
 */

const userQueries = {
  /**
   * 1. Base query for listing users with role name and assigned warehouse name.
   */
  baseUserSelect: `
    SELECT 
      u.user_id, 
      u.full_name, 
      u.email, 
      u.role_id, 
      u.warehouse_id, 
      u.is_active, 
      u.created_at, 
      u.updated_at,
      r.role_name, 
      w.warehouse_name
    FROM users u
    INNER JOIN roles r ON u.role_id = r.role_id
    LEFT JOIN warehouses w ON u.warehouse_id = w.warehouse_id
  `,

  /**
   * 2. Find user by email address.
   * Parameter: [email]
   */
  findByEmail: `
    SELECT 
      u.user_id, 
      u.full_name, 
      u.email, 
      u.password_hash,
      u.role_id, 
      u.warehouse_id, 
      u.is_active, 
      r.role_name
    FROM users u
    INNER JOIN roles r ON u.role_id = r.role_id
    WHERE u.email = ?
  `,

  /**
   * 3. Find user by ID.
   * Parameter: [user_id]
   */
  findById: `
    SELECT 
      u.user_id, 
      u.full_name, 
      u.email, 
      u.role_id, 
      u.warehouse_id, 
      u.is_active, 
      u.created_at, 
      r.role_name, 
      w.warehouse_name
    FROM users u
    INNER JOIN roles r ON u.role_id = r.role_id
    LEFT JOIN warehouses w ON u.warehouse_id = w.warehouse_id
    WHERE u.user_id = ?
  `,

  /**
   * 4. Insert a new user into the database.
   * Parameters: [full_name, email, password_hash, role_id, warehouse_id]
   */
  create: `
    INSERT INTO users (full_name, email, password_hash, role_id, warehouse_id, is_active)
    VALUES (?, ?, ?, ?, ?, TRUE)
  `,

  /**
   * 5. Update user profile details.
   * Parameters: [full_name, email, role_id, warehouse_id, is_active, user_id]
   */
  update: `
    UPDATE users 
    SET 
      full_name = ?, 
      email = ?, 
      role_id = ?, 
      warehouse_id = ?, 
      is_active = ?, 
      updated_at = CURRENT_TIMESTAMP
    WHERE user_id = ?
  `,

  /**
   * 6. Deactivate / soft delete a user.
   * Parameter: [user_id]
   */
  delete: `
    UPDATE users 
    SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP 
    WHERE user_id = ?
  `,

  /**
   * 7. Fetch all system roles for dropdown selectors.
   */
  getAllRoles: `
    SELECT role_id, role_name, description 
    FROM roles 
    ORDER BY role_id ASC
  `
};

module.exports = userQueries;