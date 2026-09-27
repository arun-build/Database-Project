/**
 * Central Export for All SQL Query Modules
 * 
 * Every query is cleanly organized into its corresponding domain file:
 * - auth: User authentication, registration, password updates
 * - products: Product catalog, SKU lookups, pricing
 * - categories: Classification groups and product counts
 * - warehouses: Storage locations, capacities, managers
 * - suppliers: Vendor details, order history
 * - inventory: Warehouse-level stock levels, replenishment thresholds
 * - purchaseOrders: Procurement orders and item lines
 * - transfers: Inter-warehouse transfer requests and approvals
 * - stockTransactions: Immutable audit trail of stock movements
 * - users: User administration and role assignments
 * - reports: Analytics, charts, summary views, and KPI metrics
 */

const authQueries = require('./auth');
const productQueries = require('./products');
const categoryQueries = require('./categories');
const warehouseQueries = require('./warehouses');
const supplierQueries = require('./suppliers');
const inventoryQueries = require('./inventory');
const purchaseOrderQueries = require('./purchaseOrders');
const transferQueries = require('./transfers');
const stockTransactionQueries = require('./stockTransactions');
const userQueries = require('./users');
const reportQueries = require('./reports');

module.exports = {
  auth: authQueries,
  products: productQueries,
  categories: categoryQueries,
  warehouses: warehouseQueries,
  suppliers: supplierQueries,
  inventory: inventoryQueries,
  purchaseOrders: purchaseOrderQueries,
  transfers: transferQueries,
  stockTransactions: stockTransactionQueries,
  users: userQueries,
  reports: reportQueries,
};