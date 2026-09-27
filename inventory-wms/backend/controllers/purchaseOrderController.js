const { pool } = require('../config/database');
const queries = require('../queries');

const getPurchaseOrders = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, supplier_id, sort_by = 'order_date', sort_order = 'DESC' } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (status) {
      whereClause += ' AND po.status = ?';
      params.push(status);
    }

    if (supplier_id) {
      whereClause += ' AND po.supplier_id = ?';
      params.push(supplier_id);
    }

    const validSortColumns = ['po_id', 'po_number', 'supplier_name', 'order_date', 'expected_delivery_date', 'total_amount', 'status'];
    const validSortOrders = ['ASC', 'DESC'];
    const sortBy = validSortColumns.includes(sort_by) ? sort_by : 'order_date';
    const sortOrder = validSortOrders.includes(sort_order.toUpperCase()) ? sort_order.toUpperCase() : 'DESC';

    const orderByMap = {
      'po_id': 'po.po_id',
      'po_number': 'po.po_number',
      'supplier_name': 's.supplier_name',
      'order_date': 'po.order_date',
      'expected_delivery_date': 'po.expected_delivery_date',
      'total_amount': 'po.total_amount',
      'status': 'po.status'
    };

    const [orders] = await pool.execute(
      `${queries.purchaseOrders.basePurchaseOrderSelect}
       ${whereClause}
       ORDER BY ${orderByMap[sortBy]} ${sortOrder}
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    const [total] = await pool.execute(
      `SELECT COUNT(*) as count 
       FROM purchase_orders po 
       JOIN suppliers s ON po.supplier_id = s.supplier_id 
       ${whereClause}`,
      params
    );

    res.json({
      success: true,
      data: {
        purchase_orders: orders,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: total[0].count,
          pages: Math.ceil(total[0].count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get purchase orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch purchase orders'
    });
  }
};

const getPurchaseOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    const [orders] = await pool.execute(queries.purchaseOrders.findById, [id]);

    if (orders.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Purchase order not found'
      });
    }

    const [items] = await pool.execute(queries.purchaseOrders.findItemsByPoId, [id]);

    res.json({
      success: true,
      data: {
        purchase_order: {
          ...orders[0],
          items
        }
      }
    });
  } catch (error) {
    console.error('Get purchase order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch purchase order'
    });
  }
};

const createPurchaseOrder = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { supplier_id, order_date, expected_delivery_date, remarks, items } = req.body;

    if (!items || items.length === 0) {
      connection.release();
      return res.status(400).json({
        success: false,
        message: 'Purchase order must have at least one item'
      });
    }

    const [supplier] = await connection.execute(
      'SELECT supplier_id FROM suppliers WHERE supplier_id = ? AND status = "Active"',
      [supplier_id]
    );

    if (supplier.length === 0) {
      connection.release();
      return res.status(404).json({
        success: false,
        message: 'Supplier not found or inactive'
      });
    }

    const [poResult] = await connection.execute(
      queries.purchaseOrders.createOrder,
      [supplier_id, order_date || new Date().toISOString().split('T')[0], expected_delivery_date || null, 0, 'Pending', req.user.user_id]
    );

    const poId = poResult.insertId;

    for (const item of items) {
      const { product_id, quantity, unit_price } = item;
      const subtotal = quantity * unit_price;

      await connection.execute(
        queries.purchaseOrders.createOrderItem,
        [poId, product_id, quantity, unit_price, subtotal]
      );
    }

    await connection.execute(
      queries.purchaseOrders.updateTotalAmount,
      [poId, poId]
    );

    await connection.commit();

    const [newOrder] = await pool.execute(queries.purchaseOrders.findById, [poId]);

    res.status(201).json({
      success: true,
      message: 'Purchase order created successfully',
      data: { purchase_order: newOrder[0] }
    });
  } catch (error) {
    await connection.rollback();
    console.error('Create purchase order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create purchase order'
    });
  } finally {
    connection.release();
  }
};

const updatePurchaseOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['Pending', 'Approved', 'Received', 'Cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const [orders] = await pool.execute(
      'SELECT status FROM purchase_orders WHERE po_id = ?',
      [id]
    );

    if (orders.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Purchase order not found'
      });
    }

    const currentStatus = orders[0].status;

    if (currentStatus === 'Received' && status !== 'Received') {
      return res.status(400).json({
        success: false,
        message: 'Cannot change status of received order'
      });
    }

    if (currentStatus === 'Cancelled' && status !== 'Cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Cannot change status of cancelled order'
      });
    }

    if (status === 'Received' && currentStatus !== 'Approved') {
      return res.status(400).json({
        success: false,
        message: 'Order must be approved before receiving'
      });
    }

    await pool.execute(queries.purchaseOrders.updateStatus, [status, id]);

    if (status === 'Received') {
      const connection = await pool.getConnection();
      try {
        await connection.execute(
          queries.purchaseOrders.callReceivePO,
          [id, req.user.user_id]
        );

        const [output] = await connection.execute(queries.purchaseOrders.getProcedureOutput);

        if (!output[0].success) {
          await connection.execute(queries.purchaseOrders.updateStatus, [currentStatus, id]);
          return res.status(400).json({
            success: false,
            message: output[0].message || 'Failed to receive purchase order'
          });
        }
      } finally {
        connection.release();
      }
    }

    const [updated] = await pool.execute(queries.purchaseOrders.findById, [id]);

    res.json({
      success: true,
      message: `Purchase order ${status.toLowerCase()} successfully`,
      data: { purchase_order: updated[0] }
    });
  } catch (error) {
    console.error('Update purchase order status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update purchase order status'
    });
  }
};

const deletePurchaseOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const [orders] = await pool.execute(
      'SELECT status FROM purchase_orders WHERE po_id = ?',
      [id]
    );

    if (orders.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Purchase order not found'
      });
    }

    if (orders[0].status !== 'Pending') {
      return res.status(400).json({
        success: false,
        message: 'Only pending purchase orders can be deleted'
      });
    }

    await pool.execute('DELETE FROM purchase_order_items WHERE po_id = ?', [id]);
    await pool.execute('DELETE FROM purchase_orders WHERE po_id = ?', [id]);

    res.json({
      success: true,
      message: 'Purchase order deleted successfully'
    });
  } catch (error) {
    console.error('Delete purchase order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete purchase order'
    });
  }
};

module.exports = {
  getPurchaseOrders,
  getPurchaseOrderById,
  createPurchaseOrder,
  updatePurchaseOrderStatus,
  deletePurchaseOrder
};