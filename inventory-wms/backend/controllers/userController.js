const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');
const queries = require('../queries');

const getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, role_id, is_active, sort_by = 'created_at', sort_order = 'DESC' } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (search) {
      whereClause += ' AND (u.full_name LIKE ? OR u.email LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
    }

    if (role_id) {
      whereClause += ' AND u.role_id = ?';
      params.push(role_id);
    }

    if (is_active !== undefined) {
      whereClause += ' AND u.is_active = ?';
      params.push(is_active === 'true');
    }

    const validSortColumns = ['user_id', 'full_name', 'email', 'role_name', 'warehouse_name', 'is_active', 'created_at'];
    const validSortOrders = ['ASC', 'DESC'];
    const sortBy = validSortColumns.includes(sort_by) ? sort_by : 'created_at';
    const sortOrder = validSortOrders.includes(sort_order.toUpperCase()) ? sort_order.toUpperCase() : 'DESC';

    const orderByMap = {
      'user_id': 'u.user_id',
      'full_name': 'u.full_name',
      'email': 'u.email',
      'role_name': 'r.role_name',
      'warehouse_name': 'w.warehouse_name',
      'is_active': 'u.is_active',
      'created_at': 'u.created_at'
    };

    const [users] = await pool.execute(
      `${queries.users.baseUserSelect}
       ${whereClause}
       ORDER BY ${orderByMap[sortBy]} ${sortOrder}
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    const [total] = await pool.execute(
      `SELECT COUNT(*) as count FROM users u ${whereClause}`,
      params
    );

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: total[0].count,
          pages: Math.ceil(total[0].count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users'
    });
  }
};

const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const [users] = await pool.execute(queries.users.findById, [id]);

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: { user: users[0] }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user'
    });
  }
};

const createUser = async (req, res) => {
  try {
    const { full_name, email, password, role_id, warehouse_id } = req.body;

    const [existing] = await pool.execute(queries.users.findByEmail, [email]);
    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    const [result] = await pool.execute(
      queries.users.create,
      [full_name, email, password_hash, role_id, warehouse_id || null]
    );

    const [newUser] = await pool.execute(queries.users.findById, [result.insertId]);

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: { user: newUser[0] }
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create user'
    });
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, email, role_id, warehouse_id, is_active } = req.body;

    const [existing] = await pool.execute(queries.users.findByEmail, [email]);
    if (existing.length > 0 && existing[0].user_id != id) {
      return res.status(400).json({
        success: false,
        message: 'Email already in use'
      });
    }

    const [result] = await pool.execute(
      queries.users.update,
      [full_name, email, role_id, warehouse_id || null, is_active !== undefined ? is_active : true, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const [updated] = await pool.execute(queries.users.findById, [id]);

    res.json({
      success: true,
      message: 'User updated successfully',
      data: { user: updated[0] }
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user'
    });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (parseInt(id) === req.user.user_id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot deactivate your own account'
      });
    }

    const [result] = await pool.execute(queries.users.delete, [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User deactivated successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user'
    });
  }
};

const getRoles = async (req, res) => {
  try {
    const [roles] = await pool.execute(queries.users.getAllRoles);
    res.json({
      success: true,
      data: { roles }
    });
  } catch (error) {
    console.error('Get roles error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch roles'
    });
  }
};

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getRoles
};