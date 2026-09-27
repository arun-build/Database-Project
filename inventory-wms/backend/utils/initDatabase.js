const fs = require('fs');
const path = require('path');
const { createPool } = require('../config/database');
const bcrypt = require('bcryptjs');

const PASSWORD_HASH = '$2a$10$J68mTM1cYIG7mah3EqSbYOJiQiPDhefCpkCcDsBzzxKlyRk7/DyiG'; // password123

async function initDatabase() {
  try {
    console.log('Initializing database...');

    const schemaPath = path.join(__dirname, '..', 'sql', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // Create pool without database for initialization
    const pool = createPool('');
    console.log('Pool created, testing connection...');
    const testConn = await pool.getConnection();
    console.log('Connected to MySQL server');
    testConn.release();

    // Get a dedicated connection for the entire initialization
    const conn = await pool.getConnection();
    
    // Disable foreign key checks for this connection
    await conn.query('SET SESSION FOREIGN_KEY_CHECKS = 0');
    const [rows] = await conn.query('SELECT @@FOREIGN_KEY_CHECKS');
    console.log('Foreign key checks:', rows[0]['@@FOREIGN_KEY_CHECKS']);

    // Parse SQL statements properly handling DELIMITER
    const statements = [];
    let currentStatement = '';
    let inDelimiterBlock = false;
    let delimiter = ';';

    const lines = schema.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();

      // Skip comments
      if (trimmedLine.startsWith('--')) {
        continue;
      }

      // Handle DELIMITER changes
      if (trimmedLine.toUpperCase().startsWith('DELIMITER')) {
        if (inDelimiterBlock) {
          inDelimiterBlock = false;
          delimiter = ';';
        } else {
          inDelimiterBlock = true;
          delimiter = trimmedLine.split(' ')[1] || '//';
        }
        continue;
      }

      // Skip empty lines
      if (!trimmedLine) {
        continue;
      }

      currentStatement += line + '\n';

      // Check if statement ends with current delimiter
      if (trimmedLine.endsWith(delimiter)) {
        if (currentStatement.trim()) {
          // Replace custom delimiter with semicolon for MySQL server
          let stmt = currentStatement.trim();
          if (delimiter !== ';') {
            stmt = stmt.slice(0, -delimiter.length).trim() + ';';
          }
          statements.push(stmt);
          currentStatement = '';
        }
      }
    }

    // Add any remaining statement
    if (currentStatement.trim()) {
      statements.push(currentStatement.trim());
    }

    console.log(`Found ${statements.length} SQL statements to execute`);

    // Execute only non-INSERT statements (schema)
    const schemaStatements = statements.filter(stmt => !stmt.trim().toUpperCase().startsWith('INSERT INTO'));

    for (let i = 0; i < schemaStatements.length; i++) {
      const statement = schemaStatements[i];
      if (!statement.trim()) continue;

      try {
        const upperStmt = statement.trim().toUpperCase();
        
        const useQuery = upperStmt.startsWith('CREATE DATABASE') || 
                         upperStmt.startsWith('USE ') ||
                         upperStmt.startsWith('CREATE PROCEDURE') ||
                         upperStmt.startsWith('CREATE TRIGGER') ||
                         upperStmt.startsWith('CREATE VIEW');
        
        if (useQuery) {
          await conn.query(statement);
        } else {
          await conn.execute(statement);
        }

        if (i % 20 === 0 || i === schemaStatements.length - 1) {
          console.log(`Schema progress: ${i + 1}/${schemaStatements.length} statements executed`);
        }
      } catch (error) {
        if (!error.message.includes('already exists') && 
            !error.message.includes('Duplicate entry') &&
            !error.message.includes('Can\'t DROP') &&
            error.code !== 'ER_TABLE_EXISTS_ERROR' &&
            error.code !== 'ER_DB_CREATE_EXISTS') {
          console.error(`Schema statement ${i + 1} failed:`, error.message);
          console.error('Statement:', statement.substring(0, 200) + '...');
        }
      }
    }

    console.log('Schema created. Inserting seed data...');

    // Insert seed data manually in correct order
    // 1. Roles
    await conn.query(`
      INSERT INTO roles (role_name, description) VALUES
      ('Admin', 'Full system access with all permissions'),
      ('Warehouse Manager', 'Manage products, stock, suppliers, purchase orders, and transfers'),
      ('Staff', 'View inventory, add stock transactions, limited editing')
    `);
    console.log('Inserted roles');

    // 2. Users (with NULL warehouse_id initially)
    await conn.query(`
      INSERT INTO users (full_name, email, password_hash, role_id, warehouse_id, is_active) VALUES
      ('Admin User', 'admin@inventory.com', ?, 1, NULL, TRUE),
      ('John Manager', 'manager@inventory.com', ?, 2, NULL, TRUE),
      ('Jane Staff', 'staff@inventory.com', ?, 3, NULL, TRUE),
      ('Mike Manager', 'manager2@inventory.com', ?, 2, NULL, TRUE),
      ('Sarah Staff', 'staff2@inventory.com', ?, 3, NULL, TRUE),
      ('Tom Staff', 'staff3@inventory.com', ?, 3, NULL, TRUE)
    `, [PASSWORD_HASH, PASSWORD_HASH, PASSWORD_HASH, PASSWORD_HASH, PASSWORD_HASH, PASSWORD_HASH]);
    console.log('Inserted users');

    // 3. Warehouses (with NULL manager_id initially)
    await conn.query(`
      INSERT INTO warehouses (warehouse_name, location, capacity, manager_id, contact_number, status) VALUES
      ('Main Warehouse', '123 Industrial Blvd, New York, NY 10001', 10000, NULL, '+1-555-0101', 'Active'),
      ('West Coast Warehouse', '456 Harbor Drive, Los Angeles, CA 90001', 8000, NULL, '+1-555-0102', 'Active'),
      ('Midwest Distribution Center', '789 Commerce St, Chicago, IL 60601', 12000, NULL, '+1-555-0103', 'Active')
    `);
    console.log('Inserted warehouses');

    // 4. Update users with warehouse_id
    await conn.query(`UPDATE users SET warehouse_id = 1 WHERE user_id IN (2, 3)`);
    await conn.query(`UPDATE users SET warehouse_id = 2 WHERE user_id IN (4, 5)`);
    await conn.query(`UPDATE users SET warehouse_id = 3 WHERE user_id = 6`);
    console.log('Updated users with warehouse_id');

    // 5. Update warehouses with manager_id
    await conn.query(`UPDATE warehouses SET manager_id = 2 WHERE warehouse_id = 1`);
    await conn.query(`UPDATE warehouses SET manager_id = 4 WHERE warehouse_id = 2`);
    console.log('Updated warehouses with manager_id');

    // 6. Categories
    await conn.query(`
      INSERT INTO categories (category_name, description) VALUES
      ('Electronics', 'Electronic devices and components'),
      ('Furniture', 'Office and home furniture'),
      ('Clothing', 'Apparel and accessories'),
      ('Books', 'Books and publications'),
      ('Tools', 'Hand and power tools')
    `);
    console.log('Inserted categories');

    // 7. Suppliers
    await conn.query(`
      INSERT INTO suppliers (supplier_name, contact_person, email, phone, address, gst_number, status) VALUES
      ('TechSupply Inc', 'Robert Chen', 'robert@techsupply.com', '+1-555-1001', '100 Tech Park, San Jose, CA', 'GST123456789', 'Active'),
      ('Furniture World', 'Maria Garcia', 'maria@furnitureworld.com', '+1-555-1002', '200 Design Ave, High Point, NC', 'GST234567890', 'Active'),
      ('Style Fashion Co', 'James Wilson', 'james@stylefashion.com', '+1-555-1003', '300 Fashion Blvd, New York, NY', 'GST345678901', 'Active'),
      ('BookHub Distributors', 'Lisa Anderson', 'lisa@bookhub.com', '+1-555-1004', '400 Library Lane, Boston, MA', 'GST456789012', 'Active'),
      ('ToolMaster Supply', 'David Brown', 'david@toolmaster.com', '+1-555-1005', '500 Industrial Way, Detroit, MI', 'GST567890123', 'Active'),
      ('ElectroParts Ltd', 'Amanda White', 'amanda@electroparts.com', '+1-555-1006', '600 Circuit Rd, Austin, TX', 'GST678901234', 'Active'),
      ('Comfort Seating', 'Chris Taylor', 'chris@comfortseating.com', '+1-555-1007', '700 Comfort Ct, Grand Rapids, MI', 'GST789012345', 'Active'),
      ('Trendy Threads', 'Patricia Lee', 'patricia@trendythreads.com', '+1-555-1008', '800 Style St, Los Angeles, CA', 'GST890123456', 'Active'),
      ('Knowledge Press', 'Michael Clark', 'michael@knowledgepress.com', '+1-555-1009', '900 Wisdom Way, Chicago, IL', 'GST901234567', 'Active'),
      ('ProTools Direct', 'Jennifer Hall', 'jennifer@protools.com', '+1-555-1010', '1000 Builder Blvd, Milwaukee, WI', 'GST012345678', 'Active')
    `);
    console.log('Inserted suppliers');

    // 8. Products
    await conn.query(`
      INSERT INTO products (sku, product_name, description, category_id, supplier_id, unit_price, selling_price, reorder_level, unit_type, status) VALUES
      ('ELEC-001', 'Wireless Mouse', 'Ergonomic wireless mouse with USB receiver', 1, 1, 12.50, 24.99, 20, 'PCS', 'Active'),
      ('ELEC-002', 'Mechanical Keyboard', 'RGB mechanical keyboard with blue switches', 1, 1, 45.00, 89.99, 15, 'PCS', 'Active'),
      ('ELEC-003', '27" 4K Monitor', '27-inch 4K UHD IPS monitor', 1, 6, 280.00, 449.99, 5, 'PCS', 'Active'),
      ('ELEC-004', 'USB-C Hub', '7-in-1 USB-C multiport adapter', 1, 1, 18.00, 39.99, 25, 'PCS', 'Active'),
      ('ELEC-005', 'Webcam 1080p', 'Full HD webcam with microphone', 1, 6, 35.00, 69.99, 10, 'PCS', 'Active'),
      ('FURN-001', 'Ergonomic Office Chair', 'Mesh back ergonomic chair with lumbar support', 2, 2, 120.00, 249.99, 8, 'PCS', 'Active'),
      ('FURN-002', 'Standing Desk', 'Electric height adjustable standing desk', 2, 2, 350.00, 599.99, 3, 'PCS', 'Active'),
      ('FURN-003', 'Bookshelf 5-Tier', 'Industrial style 5-tier bookshelf', 2, 7, 85.00, 159.99, 10, 'PCS', 'Active'),
      ('FURN-004', 'Conference Table', '10-person modern conference table', 2, 7, 450.00, 799.99, 2, 'PCS', 'Active'),
      ('FURN-005', 'File Cabinet', '3-drawer metal file cabinet with lock', 2, 2, 95.00, 179.99, 5, 'PCS', 'Active'),
      ('CLTH-001', 'Cotton T-Shirt', '100% organic cotton crew neck t-shirt', 3, 3, 8.00, 19.99, 50, 'PCS', 'Active'),
      ('CLTH-002', 'Denim Jeans', 'Classic fit denim jeans', 3, 3, 18.00, 44.99, 30, 'PCS', 'Active'),
      ('CLTH-003', 'Hooded Sweatshirt', 'Fleece lined hooded sweatshirt', 3, 8, 15.00, 34.99, 25, 'PCS', 'Active'),
      ('CLTH-004', 'Wool Scarf', 'Merino wool winter scarf', 3, 8, 12.00, 29.99, 20, 'PCS', 'Active'),
      ('CLTH-005', 'Leather Belt', 'Genuine leather belt with brass buckle', 3, 8, 10.00, 24.99, 15, 'PCS', 'Active'),
      ('BOOK-001', 'Database Design', 'Fundamentals of database systems', 4, 4, 45.00, 89.99, 10, 'PCS', 'Active'),
      ('BOOK-002', 'Web Development', 'Full stack web development guide', 4, 4, 38.00, 74.99, 12, 'PCS', 'Active'),
      ('BOOK-003', 'Data Structures', 'Algorithms and data structures in Python', 4, 9, 42.00, 84.99, 8, 'PCS', 'Active'),
      ('BOOK-004', 'Network Security', 'Cybersecurity fundamentals', 4, 9, 50.00, 99.99, 5, 'PCS', 'Active'),
      ('BOOK-005', 'Cloud Computing', 'AWS and Azure cloud architecture', 4, 4, 48.00, 94.99, 7, 'PCS', 'Active'),
      ('TOOL-001', 'Cordless Drill', '18V brushless cordless drill kit', 5, 5, 65.00, 129.99, 10, 'PCS', 'Active'),
      ('TOOL-002', 'Socket Set', '100-piece metric/SAE socket set', 5, 10, 45.00, 89.99, 12, 'PCS', 'Active'),
      ('TOOL-003', 'Laser Level', 'Self-leveling cross line laser level', 5, 10, 55.00, 109.99, 8, 'PCS', 'Active'),
      ('TOOL-004', 'Multimeter', 'Digital multimeter with auto-ranging', 5, 5, 28.00, 54.99, 15, 'PCS', 'Active'),
      ('TOOL-005', 'Tool Chest', '5-drawer rolling tool chest', 5, 10, 120.00, 229.99, 5, 'PCS', 'Active')
    `);
    console.log('Inserted products');

    // 9. Inventory (distribute products across warehouses)
    await conn.query(`
      INSERT INTO inventory (warehouse_id, product_id, quantity_available, reserved_quantity, reorder_level) VALUES
      -- Warehouse 1 (Main Warehouse)
      (1, 1, 150, 10, 20), (1, 2, 80, 5, 15), (1, 3, 25, 2, 5), (1, 4, 200, 15, 25), (1, 5, 60, 3, 10),
      (1, 6, 40, 2, 8), (1, 7, 15, 1, 3), (1, 8, 60, 3, 10), (1, 9, 8, 0, 2), (1, 10, 30, 2, 5),
      (1, 11, 300, 20, 50), (1, 12, 180, 10, 30), (1, 13, 120, 5, 25), (1, 14, 80, 3, 20), (1, 15, 100, 5, 15),
      (1, 16, 50, 3, 10), (1, 17, 60, 4, 12), (1, 18, 40, 2, 8), (1, 19, 30, 1, 5), (1, 20, 45, 2, 7),
      (1, 21, 55, 3, 10), (1, 22, 70, 4, 12), (1, 23, 35, 2, 8), (1, 24, 65, 3, 15), (1, 25, 18, 1, 5),
      -- Warehouse 2 (West Coast)
      (2, 1, 100, 5, 20), (2, 2, 50, 3, 15), (2, 3, 15, 1, 5), (2, 4, 150, 10, 25), (2, 5, 40, 2, 10),
      (2, 6, 25, 1, 8), (2, 7, 10, 0, 3), (2, 8, 40, 2, 10), (2, 9, 5, 0, 2), (2, 10, 20, 1, 5),
      (2, 11, 200, 15, 50), (2, 12, 120, 8, 30), (2, 13, 80, 4, 25), (2, 14, 50, 2, 20), (2, 15, 70, 3, 15),
      (2, 16, 35, 2, 10), (2, 17, 40, 3, 12), (2, 18, 25, 1, 8), (2, 19, 20, 1, 5), (2, 20, 30, 1, 7),
      (2, 21, 35, 2, 10), (2, 22, 45, 3, 12), (2, 23, 20, 1, 8), (2, 24, 40, 2, 15), (2, 25, 12, 0, 5),
      -- Warehouse 3 (Midwest)
      (3, 1, 120, 8, 20), (3, 2, 65, 4, 15), (3, 3, 20, 1, 5), (3, 4, 180, 12, 25), (3, 5, 50, 3, 10),
      (3, 6, 30, 2, 8), (3, 7, 12, 1, 3), (3, 8, 45, 3, 10), (3, 9, 6, 0, 2), (3, 10, 25, 1, 5),
      (3, 11, 250, 18, 50), (3, 12, 150, 10, 30), (3, 13, 100, 5, 25), (3, 14, 65, 3, 20), (3, 15, 85, 4, 15),
      (3, 16, 42, 2, 10), (3, 17, 50, 3, 12), (3, 18, 30, 2, 8), (3, 19, 25, 1, 5), (3, 20, 38, 2, 7),
      (3, 21, 42, 2, 10), (3, 22, 55, 3, 12), (3, 23, 25, 1, 8), (3, 24, 50, 2, 15), (3, 25, 15, 0, 5)
    `);
    console.log('Inserted inventory');

    // 10. Stock Transactions
    await conn.query(`
      INSERT INTO stock_transactions (product_id, warehouse_id, transaction_type, quantity, reference_type, reference_id, performed_by, transaction_date, remarks) VALUES
      (1, 1, 'STOCK_IN', 150, 'MANUAL', NULL, 2, '2024-01-15 10:00:00', 'Initial stock'),
      (2, 1, 'STOCK_IN', 80, 'MANUAL', NULL, 2, '2024-01-15 10:05:00', 'Initial stock'),
      (3, 1, 'STOCK_IN', 25, 'MANUAL', NULL, 2, '2024-01-15 10:10:00', 'Initial stock'),
      (6, 1, 'STOCK_OUT', 5, 'MANUAL', NULL, 3, '2024-01-20 14:30:00', 'Sold to customer'),
      (11, 1, 'STOCK_IN', 300, 'PURCHASE_ORDER', 1, 2, '2024-01-25 09:00:00', 'PO #1 received'),
      (12, 1, 'STOCK_OUT', 10, 'MANUAL', NULL, 3, '2024-01-28 11:15:00', 'Customer order'),
      (16, 2, 'STOCK_IN', 50, 'MANUAL', NULL, 4, '2024-02-01 10:00:00', 'Initial stock'),
      (21, 2, 'STOCK_OUT', 8, 'MANUAL', NULL, 5, '2024-02-05 15:20:00', 'Store sale'),
      (1, 3, 'STOCK_IN', 120, 'PURCHASE_ORDER', 2, 4, '2024-02-10 09:30:00', 'PO #2 received'),
      (3, 3, 'STOCK_OUT', 3, 'MANUAL', NULL, 6, '2024-02-12 13:45:00', 'Demo unit')
    `);
    console.log('Inserted stock_transactions');

    // 11. Purchase Orders
    await conn.query(`
      INSERT INTO purchase_orders (supplier_id, order_date, expected_delivery_date, total_amount, status, created_by) VALUES
      (1, '2024-01-20', '2024-01-25', 2500.00, 'Received', 2),
      (1, '2024-02-05', '2024-02-10', 1800.00, 'Received', 2),
      (2, '2024-02-10', '2024-02-18', 4500.00, 'Approved', 2),
      (3, '2024-02-15', '2024-02-22', 3200.00, 'Pending', 2),
      (6, '2024-02-20', '2024-02-28', 5600.00, 'Approved', 4),
      (2, '2024-03-01', '2024-03-10', 2800.00, 'Pending', 4)
    `);
    console.log('Inserted purchase_orders');

    // 12. Purchase Order Items
    await conn.query(`
      INSERT INTO purchase_order_items (po_id, product_id, quantity, unit_price) VALUES
      (1, 1, 100, 12.50), (1, 2, 50, 45.00), (1, 4, 100, 18.00),
      (2, 1, 50, 12.50), (2, 3, 10, 280.00), (2, 5, 20, 35.00),
      (3, 6, 20, 120.00), (3, 7, 5, 350.00), (3, 8, 20, 85.00),
      (4, 11, 100, 8.00), (4, 12, 80, 18.00), (4, 13, 60, 15.00),
      (5, 16, 20, 45.00), (5, 17, 15, 38.00), (5, 18, 10, 42.00), (5, 19, 5, 50.00), (5, 20, 10, 48.00),
      (6, 9, 3, 450.00), (6, 10, 10, 95.00), (6, 4, 15, 85.00)
    `);
    console.log('Inserted purchase_order_items');

    // 13. Stock Transfers
    await conn.query(`
      INSERT INTO stock_transfers (product_id, source_warehouse_id, destination_warehouse_id, quantity, status, requested_by, transfer_date, remarks) VALUES
      (1, 1, 2, 20, 'Completed', 2, '2024-02-15 10:00:00', 'Restock west coast'),
      (2, 1, 3, 15, 'Completed', 2, '2024-02-18 11:30:00', 'Transfer to midwest'),
      (11, 2, 1, 30, 'Pending', 5, '2024-03-01 09:00:00', 'Rebalance inventory'),
      (16, 3, 2, 10, 'Approved', 4, '2024-03-05 14:00:00', 'Customer demand')
    `);
    console.log('Inserted stock_transfers');

    // Re-enable foreign key checks
    await conn.query('SET SESSION FOREIGN_KEY_CHECKS = 1');
    conn.release();

    await pool.end();
    console.log('Database initialized successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exit(1);
  }
}

initDatabase();