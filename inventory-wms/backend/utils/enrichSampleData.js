const { pool } = require('../config/database');

async function enrichSampleData() {
  console.log('Enriching sample data for realistic dashboard representation...');
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // 1. Set a few items in inventory to Low Stock and Out of Stock for demonstration
    console.log('1. Setting realistic Low Stock and Out of Stock items...');
    // Item 9 in Warehouse 1 (Conference Table: 1 left, reorder 2 -> Low Stock)
    await conn.query('UPDATE inventory SET quantity_available = 1 WHERE warehouse_id = 1 AND product_id = 9');
    // Item 7 in Warehouse 2 (Standing Desk: 2 left, reorder 3 -> Low Stock)
    await conn.query('UPDATE inventory SET quantity_available = 2 WHERE warehouse_id = 2 AND product_id = 7');
    // Item 3 in Warehouse 2 (4K Monitor: 0 left, reorder 5 -> Out of Stock)
    await conn.query('UPDATE inventory SET quantity_available = 0, reserved_quantity = 0 WHERE warehouse_id = 2 AND product_id = 3');
    // Item 25 in Warehouse 3 (Tool Chest: 3 left, reorder 5 -> Low Stock)
    await conn.query('UPDATE inventory SET quantity_available = 3 WHERE warehouse_id = 3 AND product_id = 25');

    // 2. Generate daily stock transactions for the last 30 days
    console.log('2. Generating daily stock movements for the last 30 days...');
    // Delete old transactions or keep them, let's insert 30 days of active movements
    const productIds = [1, 2, 4, 5, 6, 8, 10, 11, 12, 13, 16, 17, 21, 22];
    const warehouseIds = [1, 2, 3];
    const userIds = [2, 3, 4, 5, 6];

    for (let dayOffset = 29; dayOffset >= 0; dayOffset--) {
      // Generate 1-2 stock IN transactions
      const inQty = Math.floor(Math.random() * 40) + 15;
      const inProduct = productIds[Math.floor(Math.random() * productIds.length)];
      const inWarehouse = warehouseIds[Math.floor(Math.random() * warehouseIds.length)];
      const inUser = userIds[Math.floor(Math.random() * userIds.length)];

      await conn.query(
        `INSERT INTO stock_transactions (product_id, warehouse_id, transaction_type, quantity, reference_type, performed_by, transaction_date, remarks)
         VALUES (?, ?, 'STOCK_IN', ?, 'MANUAL', ?, DATE_SUB(NOW(), INTERVAL ? DAY), 'Daily restocking')`,
        [inProduct, inWarehouse, inQty, inUser, dayOffset]
      );

      // Generate 1-2 stock OUT transactions
      const outQty = Math.floor(Math.random() * 30) + 10;
      const outProduct = productIds[Math.floor(Math.random() * productIds.length)];
      const outWarehouse = warehouseIds[Math.floor(Math.random() * warehouseIds.length)];
      const outUser = userIds[Math.floor(Math.random() * userIds.length)];

      await conn.query(
        `INSERT INTO stock_transactions (product_id, warehouse_id, transaction_type, quantity, reference_type, performed_by, transaction_date, remarks)
         VALUES (?, ?, 'STOCK_OUT', ?, 'MANUAL', ?, DATE_SUB(NOW(), INTERVAL ? DAY), 'Order fulfillment')`,
        [outProduct, outWarehouse, outQty, outUser, dayOffset]
      );
    }

    // 3. Generate purchase orders for the last 8 months up to current date
    console.log('3. Generating purchase orders across the last 8 months...');
    const supplierIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const amounts = [3200, 4800, 6100, 5200, 7500, 4300, 8900, 6400];

    for (let monthOffset = 7; monthOffset >= 0; monthOffset--) {
      const supId = supplierIds[monthOffset % supplierIds.length];
      const amount = amounts[monthOffset % amounts.length];
      const status = monthOffset === 0 ? 'Pending' : (monthOffset === 1 ? 'Approved' : 'Received');

      const [poRes] = await conn.query(
        `INSERT INTO purchase_orders (supplier_id, order_date, expected_delivery_date, total_amount, status, created_by)
         VALUES (?, DATE_SUB(CURDATE(), INTERVAL ? MONTH), DATE_ADD(DATE_SUB(CURDATE(), INTERVAL ? MONTH), INTERVAL 7 DAY), ?, ?, 2)`,
        [supId, monthOffset, monthOffset, amount, status]
      );

      const poId = poRes.insertId;
      // Add PO items
      await conn.query(
        `INSERT INTO purchase_order_items (po_id, product_id, quantity, unit_price)
         VALUES (?, 1, 50, 12.50), (?, 2, 30, 45.00)`,
        [poId, poId]
      );
    }

    // 4. Also add a few pending and approved stock transfers with recent dates
    console.log('4. Generating recent stock transfers...');
    await conn.query(
      `INSERT INTO stock_transfers (product_id, source_warehouse_id, destination_warehouse_id, quantity, status, requested_by, transfer_date, remarks)
       VALUES 
       (1, 1, 2, 25, 'Pending', 2, NOW(), 'Emergency replenishment for West Coast'),
       (4, 1, 3, 40, 'Approved', 4, DATE_SUB(NOW(), INTERVAL 1 DAY), 'Midwest bulk demand'),
       (11, 2, 1, 35, 'Completed', 3, DATE_SUB(NOW(), INTERVAL 3 DAY), 'Stock balancing complete')`
    );

    await conn.commit();
    console.log('Sample data successfully enriched!');
  } catch (err) {
    await conn.rollback();
    console.error('Failed to enrich sample data:', err);
    throw err;
  } finally {
    conn.release();
    process.exit(0);
  }
}

enrichSampleData();
