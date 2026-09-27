/**
 * Authentication & Profile SQL Queries
 * 
 * DBMS Concepts Illustrated:
 * - Inner Join between `users` (N) and `roles` (1) on foreign key `role_id`
 * - Left Join with `warehouses` to support optional warehouse assignment
 * - Indexed lookups on `users.email` (Unique Index) for O(1) retrieval
 */

const authQueries = {
  /**
   * Find an active user by email address for login verification.
   * Joins roles table to retrieve role permissions.
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
   * Check whether an email is already registered in the system.
   */
  checkEmailExists: `
    SELECT user_id 
    FROM users 
    WHERE email = ?
  `,

  /**
   * Insert a newly registered user into the database.
   */
  createUser: `
    INSERT INTO users (full_name, email, password_hash, role_id, warehouse_id)
    VALUES (?, ?, ?, ?, ?)
  `,

  /**
   * Retrieve current authenticated user profile details by primary key user_id.
   * Includes role and assigned warehouse name.
   */
  getUserProfile: `
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
   * Get current password hash to verify before changing password.
   */
  getPasswordHash: `
    SELECT password_hash 
    FROM users 
    WHERE user_id = ?
  `,

  /**
   * Update password hash for an existing user.
   */
  updatePassword: `
    UPDATE users 
    SET password_hash = ?, updated_at = CURRENT_TIMESTAMP 
    WHERE user_id = ?
  `
};

module.exports = authQueries;
