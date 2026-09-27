const { pool } = require('../config/database');
const queries = require('../queries');

const getCategories = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, sort_by = 'category_name', sort_order = 'ASC' } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = '';
    const params = [];

    if (search) {
      whereClause = 'WHERE c.category_name LIKE ? OR c.description LIKE ?';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
    }

    const validSortColumns = ['category_id', 'category_name', 'created_at'];
    const validSortOrders = ['ASC', 'DESC'];
    const sortBy = validSortColumns.includes(sort_by) ? sort_by : 'category_name';
    const sortOrder = validSortOrders.includes(sort_order.toUpperCase()) ? sort_order.toUpperCase() : 'ASC';

    const [categories] = await pool.execute(
      `SELECT 
         c.category_id, 
         c.category_name, 
         c.description, 
         c.created_at, 
         COUNT(p.product_id) as product_count
       FROM categories c
       LEFT JOIN products p ON c.category_id = p.category_id AND p.status != 'Discontinued'
       ${whereClause}
       GROUP BY c.category_id, c.category_name, c.description, c.created_at
       ORDER BY c.${sortBy} ${sortOrder}
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    const [total] = await pool.execute(
      `SELECT COUNT(*) as count FROM categories c ${whereClause}`,
      params
    );

    res.json({
      success: true,
      data: {
        categories,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: total[0].count,
          pages: Math.ceil(total[0].count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories'
    });
  }
};

const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    const [categories] = await pool.execute(queries.categories.findById, [id]);

    if (categories.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    res.json({
      success: true,
      data: { category: categories[0] }
    });
  } catch (error) {
    console.error('Get category error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch category'
    });
  }
};

const createCategory = async (req, res) => {
  try {
    const { category_name, description } = req.body;

    const [existing] = await pool.execute(queries.categories.findByName, [category_name]);
    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Category name already exists'
      });
    }

    const [result] = await pool.execute(queries.categories.create, [category_name, description || null]);
    const [newCategory] = await pool.execute(queries.categories.findById, [result.insertId]);

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: { category: newCategory[0] }
    });
  } catch (error) {
    console.error('Create category error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({
        success: false,
        message: 'Category name already exists'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to create category'
    });
  }
};

const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { category_name, description } = req.body;

    const [existing] = await pool.execute(queries.categories.findByName, [category_name]);
    if (existing.length > 0 && existing[0].category_id != id) {
      return res.status(400).json({
        success: false,
        message: 'Category name already exists'
      });
    }

    const [result] = await pool.execute(queries.categories.update, [category_name, description || null, id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    const [updated] = await pool.execute(queries.categories.findById, [id]);

    res.json({
      success: true,
      message: 'Category updated successfully',
      data: { category: updated[0] }
    });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update category'
    });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const [productCheck] = await pool.execute(queries.categories.checkProductsInCategory, [id]);
    if (productCheck[0].count > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete category that contains products. Please reassign or delete products first.'
      });
    }

    const [result] = await pool.execute(queries.categories.delete, [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    res.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete category'
    });
  }
};

module.exports = {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory
};