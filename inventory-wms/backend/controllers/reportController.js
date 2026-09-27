const { pool } = require('../config/database');
const queries = require('../queries');

const getLowStockReport = async (req, res) => {
  try {
    const { warehouse_id, category_id, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (req.user.role_name === 'Staff' && req.user.warehouse_id) {
      whereClause += ' AND warehouse_id = ?';
      params.push(req.user.warehouse_id);
    } else if (warehouse_id) {
      whereClause += ' AND warehouse_id = ?';
      params.push(warehouse_id);
    }

    if (category_id) {
      whereClause += ' AND category_id = ?';
      params.push(category_id);
    }

    const [report] = await pool.execute(
      `SELECT * FROM low_stock_view ${whereClause} ORDER BY stock_deficit ASC, product_name LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    const [total] = await pool.execute(
      `SELECT COUNT(*) as count FROM low_stock_view ${whereClause}`,
      params
    );

    res.json({
      success: true,
      data: {
        report,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: total[0].count,
          pages: Math.ceil(total[0].count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Low stock report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch low stock report'
    });
  }
};

const getInventoryValueReport = async (req, res) => {
  try {
    const { warehouse_id, category_id, supplier_id, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (req.user.role_name === 'Staff' && req.user.warehouse_id) {
      whereClause += ' AND warehouse_id = ?';
      params.push(req.user.warehouse_id);
    } else if (warehouse_id) {
      whereClause += ' AND warehouse_id = ?';
      params.push(warehouse_id);
    }

    if (category_id) {
      whereClause += ' AND category_id = ?';
      params.push(category_id);
    }

    if (supplier_id) {
      whereClause += ' AND supplier_id = ?';
      params.push(supplier_id);
    }

    const [report] = await pool.execute(
      `SELECT * FROM inventory_value_view ${whereClause} ORDER BY cost_value DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    const [totals] = await pool.execute(
      `SELECT 
         COALESCE(SUM(cost_value), 0) as total_cost_value,
         COALESCE(SUM(retail_value), 0) as total_retail_value,
         COALESCE(SUM(potential_profit), 0) as total_potential_profit
       FROM inventory_value_view ${whereClause}`,
      params
    );

    const [total] = await pool.execute(
      `SELECT COUNT(*) as count FROM inventory_value_view ${whereClause}`,
      params
    );

    res.json({
      success: true,
      data: {
        report,
        summary: totals[0],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: total[0].count,
          pages: Math.ceil(total[0].count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Inventory value report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch inventory value report'
    });
  }
};

const getTransactionReport = async (req, res) => {
  try {
    const { product_id, warehouse_id, transaction_type, start_date, end_date, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (req.user.role_name === 'Staff' && req.user.warehouse_id) {
      whereClause += ' AND warehouse_id = ?';
      params.push(req.user.warehouse_id);
    } else if (warehouse_id) {
      whereClause += ' AND warehouse_id = ?';
      params.push(warehouse_id);
    }

    if (product_id) {
      whereClause += ' AND product_id = ?';
      params.push(product_id);
    }

    if (transaction_type) {
      whereClause += ' AND transaction_type = ?';
      params.push(transaction_type);
    }

    if (start_date) {
      whereClause += ' AND DATE(transaction_date) >= ?';
      params.push(start_date);
    }

    if (end_date) {
      whereClause += ' AND DATE(transaction_date) <= ?';
      params.push(end_date);
    }

    const [report] = await pool.execute(
      `SELECT * FROM product_transaction_view ${whereClause} ORDER BY transaction_date DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    const [total] = await pool.execute(
      `SELECT COUNT(*) as count FROM product_transaction_view ${whereClause}`,
      params
    );

    res.json({
      success: true,
      data: {
        report,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: total[0].count,
          pages: Math.ceil(total[0].count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Transaction report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transaction report'
    });
  }
};

const getPurchaseOrderReport = async (req, res) => {
  try {
    const { supplier_id, status, start_date, end_date, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (supplier_id) {
      whereClause += ' AND po.supplier_id = ?';
      params.push(supplier_id);
    }

    if (status) {
      whereClause += ' AND po.status = ?';
      params.push(status);
    }

    if (start_date) {
      whereClause += ' AND po.order_date >= ?';
      params.push(start_date);
    }

    if (end_date) {
      whereClause += ' AND po.order_date <= ?';
      params.push(end_date);
    }

    const [report] = await pool.execute(
      `SELECT po.*, s.supplier_name, u.full_name as created_by_name
       FROM purchase_orders po
       JOIN suppliers s ON po.supplier_id = s.supplier_id
       JOIN users u ON po.created_by = u.user_id
       ${whereClause}
       ORDER BY po.order_date DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    const [totals] = await pool.execute(
      `SELECT 
         COUNT(*) as total_orders,
         COALESCE(SUM(total_amount), 0) as total_amount,
         COUNT(DISTINCT supplier_id) as unique_suppliers
       FROM purchase_orders po ${whereClause}`,
      params
    );

    const [total] = await pool.execute(
      `SELECT COUNT(*) as count FROM purchase_orders po ${whereClause}`,
      params
    );

    res.json({
      success: true,
      data: {
        report,
        summary: totals[0],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: total[0].count,
          pages: Math.ceil(total[0].count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Purchase order report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch purchase order report'
    });
  }
};

const getInventorySummaryReport = async (req, res) => {
  try {
    const { warehouse_id, category_id, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (req.user.role_name === 'Staff' && req.user.warehouse_id) {
      whereClause += ' AND i.warehouse_id = ?';
      params.push(req.user.warehouse_id);
    } else if (warehouse_id) {
      whereClause += ' AND i.warehouse_id = ?';
      params.push(warehouse_id);
    }

    if (category_id) {
      whereClause += ' AND p.category_id = ?';
      params.push(category_id);
    }

    const [report] = await pool.execute(
      `${queries.reports.getInventorySummary} ${whereClause} ORDER BY w.warehouse_name, p.product_name LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    const [total] = await pool.execute(
      `SELECT COUNT(*) as count FROM inventory i JOIN products p ON i.product_id = p.product_id ${whereClause}`,
      params
    );

    res.json({
      success: true,
      data: {
        report,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: total[0].count,
          pages: Math.ceil(total[0].count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Inventory summary report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch inventory summary report'
    });
  }
};

const getDashboardCharts = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;

    const [stockInOut] = await pool.execute(queries.reports.getStockInOutChart, [days]);
    const [byCategory] = await pool.execute(queries.reports.getInventoryByCategory);
    const [byWarehouse] = await pool.execute(queries.reports.getWarehouseStockDistribution);
    const [monthlyPurchases] = await pool.execute(queries.reports.getMonthlyPurchaseTrends);

    res.json({
      success: true,
      data: {
        stockInOut,
        byCategory,
        byWarehouse,
        monthlyPurchases,
        stock_in_out: stockInOut,
        by_category: byCategory,
        by_warehouse: byWarehouse,
        monthly_purchases: monthlyPurchases
      }
    });
  } catch (error) {
    console.error('Dashboard charts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard charts'
    });
  }
};

const getDashboardStats = async (req, res) => {
  try {
    let statsData = {};
    try {
      const [statsResult] = await pool.execute(queries.reports.callDashboardStats);
      if (Array.isArray(statsResult) && statsResult.length > 0) {
        statsData = Array.isArray(statsResult[0]) ? statsResult[0][0] : statsResult[0];
      }
    } catch (e) {
      const [fallback] = await pool.execute(queries.reports.getDashboardStats);
      statsData = fallback[0];
    }

    const [recentTransactions] = await pool.execute(queries.reports.getRecentTransactions);
    const [lowStockAlerts] = await pool.execute(queries.reports.getLowStockAlerts);
    const [pendingPOs] = await pool.execute(queries.reports.getPendingPurchaseOrders);

    res.json({
      success: true,
      data: {
        stats: statsData,
        recent_transactions: recentTransactions,
        low_stock_alerts: lowStockAlerts,
        pending_purchase_orders: pendingPOs
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard stats'
    });
  }
};

const exportReport = async (req, res) => {
  try {
    const { type, warehouse_id, category_id, start_date, end_date, product_id } = req.query;

    let report = [];
    let filename = 'report.csv';

    switch (type) {
      case 'inventory':
        filename = 'inventory_summary_report.csv';
        let whereClause = 'WHERE 1=1';
        const params = [];

        if (warehouse_id) {
          whereClause += ' AND i.warehouse_id = ?';
          params.push(warehouse_id);
        }
        if (category_id) {
          whereClause += ' AND p.category_id = ?';
          params.push(category_id);
        }

        [report] = await pool.execute(
          `${queries.reports.getInventorySummary} ${whereClause} ORDER BY w.warehouse_name, p.product_name`,
          params
        );
        break;

      case 'low-stock':
        filename = 'low_stock_report.csv';
        [report] = await pool.execute('SELECT * FROM low_stock_view ORDER BY stock_deficit ASC');
        break;

      case 'inventory-value':
        filename = 'inventory_valuation_report.csv';
        [report] = await pool.execute('SELECT * FROM inventory_value_view ORDER BY cost_value DESC');
        break;

      case 'transactions':
        filename = 'transaction_report.csv';
        let transWhere = 'WHERE 1=1';
        const transParams = [];

        if (start_date) {
          transWhere += ' AND DATE(transaction_date) >= ?';
          transParams.push(start_date);
        }
        if (end_date) {
          transWhere += ' AND DATE(transaction_date) <= ?';
          transParams.push(end_date);
        }
        if (warehouse_id) {
          transWhere += ' AND warehouse_id = ?';
          transParams.push(warehouse_id);
        }
        if (product_id) {
          transWhere += ' AND product_id = ?';
          transParams.push(product_id);
        }

        [report] = await pool.execute(
          `SELECT * FROM product_transaction_view ${transWhere} ORDER BY transaction_date DESC`,
          transParams
        );
        break;

      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid report type'
        });
    }

    if (report.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No data to export'
      });
    }

    const headers = Object.keys(report[0]);
    const csvRows = [headers.join(',')];

    for (const row of report) {
      const values = headers.map(header => {
        const value = row[header];
        if (value === null || value === undefined) return '';
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      });
      csvRows.push(values.join(','));
    }

    const csv = csvRows.join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (error) {
    console.error('Export report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export report'
    });
  }
};

module.exports = {
  getLowStockReport,
  getInventoryValueReport,
  getTransactionReport,
  getPurchaseOrderReport,
  getInventorySummaryReport,
  getDashboardCharts,
  getDashboardStats,
  exportReport
};