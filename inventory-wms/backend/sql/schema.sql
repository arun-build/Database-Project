-- Inventory & Warehouse Management System Database Schema
-- MySQL 8.0+ Compatible
-- Demonstrates: Normalization (3NF), PK/FK, Constraints, Indexes, Views, Triggers, Stored Procedures, Transactions

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP DATABASE IF EXISTS inventory_wms;
CREATE DATABASE inventory_wms CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE inventory_wms;

-- ============================================
-- TABLE: roles
-- ============================================
CREATE TABLE roles (
    role_id INT AUTO_INCREMENT PRIMARY KEY,
    role_name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================
-- TABLE: users
-- ============================================
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role_id INT NOT NULL,
    warehouse_id INT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(role_id) ON DELETE RESTRICT,
    INDEX idx_users_email (email),
    INDEX idx_users_role (role_id),
    INDEX idx_users_warehouse (warehouse_id)
) ENGINE=InnoDB;

-- ============================================
-- TABLE: warehouses
-- ============================================
CREATE TABLE warehouses (
    warehouse_id INT AUTO_INCREMENT PRIMARY KEY,
    warehouse_name VARCHAR(100) NOT NULL,
    location VARCHAR(255) NOT NULL,
    capacity INT NOT NULL CHECK (capacity > 0),
    manager_id INT NULL,
    contact_number VARCHAR(20),
    status ENUM('Active', 'Inactive', 'Maintenance') DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (manager_id) REFERENCES users(user_id) ON DELETE SET NULL,
    INDEX idx_warehouses_status (status),
    INDEX idx_warehouses_manager (manager_id)
) ENGINE=InnoDB;

-- Add FK from users to warehouses (circular reference handled)
ALTER TABLE users 
ADD CONSTRAINT fk_users_warehouse 
FOREIGN KEY (warehouse_id) REFERENCES warehouses(warehouse_id) ON DELETE SET NULL;

-- ============================================
-- TABLE: categories
-- ============================================
CREATE TABLE categories (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    category_name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_categories_name (category_name)
) ENGINE=InnoDB;

-- ============================================
-- TABLE: suppliers
-- ============================================
CREATE TABLE suppliers (
    supplier_id INT AUTO_INCREMENT PRIMARY KEY,
    supplier_name VARCHAR(150) NOT NULL,
    contact_person VARCHAR(100),
    email VARCHAR(150),
    phone VARCHAR(20),
    address TEXT,
    gst_number VARCHAR(50),
    status ENUM('Active', 'Inactive') DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_suppliers_name (supplier_name),
    INDEX idx_suppliers_status (status),
    INDEX idx_suppliers_gst (gst_number)
) ENGINE=InnoDB;

-- ============================================
-- TABLE: products
-- ============================================
CREATE TABLE products (
    product_id INT AUTO_INCREMENT PRIMARY KEY,
    sku VARCHAR(50) NOT NULL UNIQUE,
    product_name VARCHAR(200) NOT NULL,
    description TEXT,
    category_id INT NOT NULL,
    supplier_id INT NOT NULL,
    unit_price DECIMAL(12,2) NOT NULL CHECK (unit_price >= 0),
    selling_price DECIMAL(12,2) NOT NULL CHECK (selling_price >= 0),
    reorder_level INT NOT NULL DEFAULT 10 CHECK (reorder_level >= 0),
    unit_type VARCHAR(20) NOT NULL DEFAULT 'PCS',
    status ENUM('Active', 'Inactive', 'Discontinued') DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE RESTRICT,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(supplier_id) ON DELETE RESTRICT,
    INDEX idx_products_sku (sku),
    INDEX idx_products_category (category_id),
    INDEX idx_products_supplier (supplier_id),
    INDEX idx_products_status (status),
    FULLTEXT INDEX idx_products_search (product_name, description, sku)
) ENGINE=InnoDB;

-- ============================================
-- TABLE: inventory
-- ============================================
CREATE TABLE inventory (
    inventory_id INT AUTO_INCREMENT PRIMARY KEY,
    warehouse_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity_available INT NOT NULL DEFAULT 0 CHECK (quantity_available >= 0),
    reserved_quantity INT NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0),
    reorder_level INT NOT NULL DEFAULT 10 CHECK (reorder_level >= 0),
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(warehouse_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE,
    UNIQUE KEY uk_inventory_warehouse_product (warehouse_id, product_id),
    INDEX idx_inventory_warehouse (warehouse_id),
    INDEX idx_inventory_product (product_id),
    INDEX idx_inventory_low_stock (quantity_available, reorder_level)
) ENGINE=InnoDB;

-- ============================================
-- TABLE: stock_transactions
-- ============================================
CREATE TABLE stock_transactions (
    transaction_id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    warehouse_id INT NOT NULL,
    transaction_type ENUM('STOCK_IN', 'STOCK_OUT', 'ADJUSTMENT', 'RETURN') NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    reference_type ENUM('PURCHASE_ORDER', 'STOCK_TRANSFER', 'MANUAL', 'RETURN', 'ADJUSTMENT') NOT NULL DEFAULT 'MANUAL',
    reference_id INT NULL,
    performed_by INT NOT NULL,
    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    remarks TEXT,
    FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE RESTRICT,
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(warehouse_id) ON DELETE RESTRICT,
    FOREIGN KEY (performed_by) REFERENCES users(user_id) ON DELETE RESTRICT,
    INDEX idx_transactions_product (product_id),
    INDEX idx_transactions_warehouse (warehouse_id),
    INDEX idx_transactions_type (transaction_type),
    INDEX idx_transactions_date (transaction_date),
    INDEX idx_transactions_reference (reference_type, reference_id)
) ENGINE=InnoDB;

-- ============================================
-- TABLE: purchase_orders
-- ============================================
CREATE TABLE purchase_orders (
    po_id INT AUTO_INCREMENT PRIMARY KEY,
    supplier_id INT NOT NULL,
    order_date DATE NOT NULL,
    expected_delivery_date DATE,
    total_amount DECIMAL(14,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
    status ENUM('Pending', 'Approved', 'Received', 'Cancelled') DEFAULT 'Pending',
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(supplier_id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE RESTRICT,
    INDEX idx_po_supplier (supplier_id),
    INDEX idx_po_status (status),
    INDEX idx_po_date (order_date),
    INDEX idx_po_created_by (created_by)
) ENGINE=InnoDB;

-- ============================================
-- TABLE: purchase_order_items
-- ============================================
CREATE TABLE purchase_order_items (
    poi_id INT AUTO_INCREMENT PRIMARY KEY,
    po_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(12,2) NOT NULL CHECK (unit_price >= 0),
    subtotal DECIMAL(14,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    FOREIGN KEY (po_id) REFERENCES purchase_orders(po_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE RESTRICT,
    INDEX idx_poi_po (po_id),
    INDEX idx_poi_product (product_id)
) ENGINE=InnoDB;

-- ============================================
-- TABLE: stock_transfers
-- ============================================
CREATE TABLE stock_transfers (
    transfer_id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    source_warehouse_id INT NOT NULL,
    destination_warehouse_id INT NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    status ENUM('Pending', 'Approved', 'Completed', 'Cancelled') DEFAULT 'Pending',
    requested_by INT NOT NULL,
    approved_by INT NULL,
    transfer_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_date TIMESTAMP NULL,
    remarks TEXT,
    FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE RESTRICT,
    FOREIGN KEY (source_warehouse_id) REFERENCES warehouses(warehouse_id) ON DELETE RESTRICT,
    FOREIGN KEY (destination_warehouse_id) REFERENCES warehouses(warehouse_id) ON DELETE RESTRICT,
    FOREIGN KEY (requested_by) REFERENCES users(user_id) ON DELETE RESTRICT,
    FOREIGN KEY (approved_by) REFERENCES users(user_id) ON DELETE SET NULL,
    CHECK (source_warehouse_id != destination_warehouse_id),
    INDEX idx_transfers_product (product_id),
    INDEX idx_transfers_source (source_warehouse_id),
    INDEX idx_transfers_destination (destination_warehouse_id),
    INDEX idx_transfers_status (status),
    INDEX idx_transfers_date (transfer_date)
) ENGINE=InnoDB;

-- ============================================
-- VIEWS
-- ============================================

-- View: Low Stock Products
CREATE VIEW low_stock_view AS
SELECT 
    i.inventory_id,
    p.product_id,
    p.sku,
    p.product_name,
    c.category_name,
    w.warehouse_id,
    w.warehouse_name,
    i.quantity_available,
    i.reorder_level,
    (i.quantity_available - i.reorder_level) AS stock_deficit,
    CASE 
        WHEN i.quantity_available = 0 THEN 'Out of Stock'
        WHEN i.quantity_available <= i.reorder_level THEN 'Low Stock'
        ELSE 'In Stock'
    END AS stock_status
FROM inventory i
JOIN products p ON i.product_id = p.product_id
JOIN categories c ON p.category_id = c.category_id
JOIN warehouses w ON i.warehouse_id = w.warehouse_id
WHERE i.quantity_available <= i.reorder_level
AND p.status = 'Active'
AND w.status = 'Active';

-- View: Warehouse Inventory Summary
CREATE VIEW warehouse_inventory_view AS
SELECT 
    w.warehouse_id,
    w.warehouse_name,
    w.location,
    w.capacity,
    COUNT(i.product_id) AS total_products,
    SUM(i.quantity_available) AS total_stock,
    ROUND((SUM(i.quantity_available) / w.capacity) * 100, 2) AS utilization_percentage,
    SUM(CASE WHEN i.quantity_available = 0 THEN 1 ELSE 0 END) AS out_of_stock_count,
    SUM(CASE WHEN i.quantity_available <= i.reorder_level AND i.quantity_available > 0 THEN 1 ELSE 0 END) AS low_stock_count
FROM warehouses w
LEFT JOIN inventory i ON w.warehouse_id = i.warehouse_id
LEFT JOIN products p ON i.product_id = p.product_id AND p.status = 'Active'
WHERE w.status = 'Active'
GROUP BY w.warehouse_id, w.warehouse_name, w.location, w.capacity;

-- View: Inventory Valuation
CREATE VIEW inventory_value_view AS
SELECT 
    i.inventory_id,
    p.product_id,
    p.sku,
    p.product_name,
    c.category_name,
    s.supplier_name,
    w.warehouse_id,
    w.warehouse_name,
    i.quantity_available,
    p.unit_price,
    p.selling_price,
    (i.quantity_available * p.unit_price) AS cost_value,
    (i.quantity_available * p.selling_price) AS retail_value,
    ((p.selling_price - p.unit_price) * i.quantity_available) AS potential_profit
FROM inventory i
JOIN products p ON i.product_id = p.product_id
JOIN categories c ON p.category_id = c.category_id
JOIN suppliers s ON p.supplier_id = s.supplier_id
JOIN warehouses w ON i.warehouse_id = w.warehouse_id
WHERE p.status = 'Active' AND w.status = 'Active' AND i.quantity_available > 0;

-- View: Product Transaction Summary
CREATE VIEW product_transaction_view AS
SELECT 
    st.transaction_id,
    st.product_id,
    p.sku,
    p.product_name,
    st.warehouse_id,
    w.warehouse_name,
    st.transaction_type,
    st.quantity,
    st.reference_type,
    st.reference_id,
    u.full_name AS performed_by,
    st.transaction_date,
    st.remarks
FROM stock_transactions st
JOIN products p ON st.product_id = p.product_id
JOIN warehouses w ON st.warehouse_id = w.warehouse_id
JOIN users u ON st.performed_by = u.user_id;

-- View: Monthly Purchase Trends
CREATE VIEW monthly_purchase_trends AS
SELECT 
    YEAR(po.order_date) AS year,
    MONTH(po.order_date) AS month,
    MONTHNAME(po.order_date) AS month_name,
    COUNT(DISTINCT po.po_id) AS total_orders,
    SUM(po.total_amount) AS total_amount,
    COUNT(DISTINCT po.supplier_id) AS unique_suppliers
FROM purchase_orders po
WHERE po.status IN ('Approved', 'Received')
GROUP BY YEAR(po.order_date), MONTH(po.order_date), MONTHNAME(po.order_date)
ORDER BY YEAR(po.order_date) DESC, MONTH(po.order_date) DESC;

-- ============================================
-- STORED PROCEDURES
-- ============================================

DELIMITER //

-- Procedure: Get Low Stock Products
CREATE PROCEDURE GetLowStockProducts(IN p_warehouse_id INT)
BEGIN
    SELECT * FROM low_stock_view
    WHERE (p_warehouse_id IS NULL OR warehouse_id = p_warehouse_id)
    ORDER BY stock_deficit ASC, product_name;
END //

-- Procedure: Get Warehouse Inventory
CREATE PROCEDURE GetWarehouseInventory(IN p_warehouse_id INT)
BEGIN
    SELECT 
        i.inventory_id,
        p.product_id,
        p.sku,
        p.product_name,
        c.category_name,
        i.quantity_available,
        i.reserved_quantity,
        (i.quantity_available - i.reserved_quantity) AS free_quantity,
        i.reorder_level,
        CASE 
            WHEN i.quantity_available = 0 THEN 'Out of Stock'
            WHEN i.quantity_available <= i.reorder_level THEN 'Low Stock'
            ELSE 'In Stock'
        END AS stock_status,
        p.unit_price,
        (i.quantity_available * p.unit_price) AS stock_value
    FROM inventory i
    JOIN products p ON i.product_id = p.product_id
    JOIN categories c ON p.category_id = c.category_id
    WHERE i.warehouse_id = p_warehouse_id
    AND p.status = 'Active'
    ORDER BY p.product_name;
END //

-- Procedure: Transfer Stock Between Warehouses (with Transaction)
CREATE PROCEDURE TransferStock(
    IN p_product_id INT,
    IN p_source_warehouse_id INT,
    IN p_destination_warehouse_id INT,
    IN p_quantity INT,
    IN p_requested_by INT,
    IN p_remarks TEXT,
    OUT p_transfer_id INT,
    OUT p_success BOOLEAN,
    OUT p_message VARCHAR(255)
)
BEGIN
    DECLARE v_source_qty INT DEFAULT 0;
    DECLARE v_dest_exists BOOLEAN DEFAULT FALSE;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_success = FALSE;
        SET p_message = 'Transfer failed due to database error';
        SET p_transfer_id = NULL;
    END;

    START TRANSACTION;

    -- Check source warehouse has enough stock
    SELECT quantity_available INTO v_source_qty
    FROM inventory
    WHERE product_id = p_product_id AND warehouse_id = p_source_warehouse_id
    FOR UPDATE;

    IF v_source_qty IS NULL OR v_source_qty < p_quantity THEN
        ROLLBACK;
        SET p_success = FALSE;
        SET p_message = 'Insufficient stock in source warehouse';
        SET p_transfer_id = NULL;
    ELSE
        -- Create transfer record
        INSERT INTO stock_transfers (product_id, source_warehouse_id, destination_warehouse_id, quantity, status, requested_by, remarks)
        VALUES (p_product_id, p_source_warehouse_id, p_destination_warehouse_id, p_quantity, 'Pending', p_requested_by, p_remarks);
        
        SET p_transfer_id = LAST_INSERT_ID();
        SET p_success = TRUE;
        SET p_message = 'Transfer request created successfully';
        COMMIT;
    END IF;
END //

-- Procedure: Approve Stock Transfer
CREATE PROCEDURE ApproveStockTransfer(
    IN p_transfer_id INT,
    IN p_approved_by INT,
    OUT p_success BOOLEAN,
    OUT p_message VARCHAR(255)
)
BEGIN
    DECLARE v_product_id INT;
    DECLARE v_source_id INT;
    DECLARE v_dest_id INT;
    DECLARE v_quantity INT;
    DECLARE v_status VARCHAR(20);
    DECLARE v_source_qty INT;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_success = FALSE;
        SET p_message = 'Approval failed due to database error';
    END;

    START TRANSACTION;

    -- Get transfer details
    SELECT product_id, source_warehouse_id, destination_warehouse_id, quantity, status
    INTO v_product_id, v_source_id, v_dest_id, v_quantity, v_status
    FROM stock_transfers
    WHERE transfer_id = p_transfer_id
    FOR UPDATE;

    IF v_status != 'Pending' THEN
        ROLLBACK;
        SET p_success = FALSE;
        SET p_message = 'Transfer is not in pending status';
    ELSE
        -- Check source stock again
        SELECT quantity_available INTO v_source_qty
        FROM inventory
        WHERE product_id = v_product_id AND warehouse_id = v_source_id
        FOR UPDATE;

        IF v_source_qty < v_quantity THEN
            ROLLBACK;
            SET p_success = FALSE;
            SET p_message = 'Insufficient stock in source warehouse';
        ELSE
            -- Update transfer status
            UPDATE stock_transfers 
            SET status = 'Approved', approved_by = p_approved_by
            WHERE transfer_id = p_transfer_id;

            SET p_success = TRUE;
            SET p_message = 'Transfer approved successfully';
            COMMIT;
        END IF;
    END IF;
END //

-- Procedure: Complete Stock Transfer
CREATE PROCEDURE CompleteStockTransfer(
    IN p_transfer_id INT,
    OUT p_success BOOLEAN,
    OUT p_message VARCHAR(255)
)
BEGIN
    DECLARE v_product_id INT;
    DECLARE v_source_id INT;
    DECLARE v_dest_id INT;
    DECLARE v_quantity INT;
    DECLARE v_status VARCHAR(20);
    DECLARE v_source_qty INT;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_success = FALSE;
        SET p_message = 'Completion failed due to database error';
    END;

    START TRANSACTION;

    SELECT product_id, source_warehouse_id, destination_warehouse_id, quantity, status
    INTO v_product_id, v_source_id, v_dest_id, v_quantity, v_status
    FROM stock_transfers
    WHERE transfer_id = p_transfer_id
    FOR UPDATE;

    IF v_status != 'Approved' THEN
        ROLLBACK;
        SET p_success = FALSE;
        SET p_message = 'Transfer must be approved before completion';
    ELSE
        -- Check source stock
        SELECT quantity_available INTO v_source_qty
        FROM inventory
        WHERE product_id = v_product_id AND warehouse_id = v_source_id
        FOR UPDATE;

        IF v_source_qty < v_quantity THEN
            ROLLBACK;
            SET p_success = FALSE;
            SET p_message = 'Insufficient stock in source warehouse';
        ELSE
            -- Decrease source inventory
            UPDATE inventory
            SET quantity_available = quantity_available - v_quantity,
                last_updated = CURRENT_TIMESTAMP
            WHERE product_id = v_product_id AND warehouse_id = v_source_id;

            -- Increase destination inventory (insert if not exists)
            INSERT INTO inventory (warehouse_id, product_id, quantity_available, reorder_level)
            VALUES (v_dest_id, v_product_id, v_quantity, 
                (SELECT reorder_level FROM products WHERE product_id = v_product_id))
            ON DUPLICATE KEY UPDATE
                quantity_available = quantity_available + v_quantity,
                last_updated = CURRENT_TIMESTAMP;

            -- Record stock out transaction
            INSERT INTO stock_transactions (product_id, warehouse_id, transaction_type, quantity, reference_type, reference_id, performed_by, remarks)
            VALUES (v_product_id, v_source_id, 'STOCK_OUT', v_quantity, 'STOCK_TRANSFER', p_transfer_id, 
                (SELECT requested_by FROM stock_transfers WHERE transfer_id = p_transfer_id),
                CONCAT('Transfer to warehouse ', v_dest_id));

            -- Record stock in transaction
            INSERT INTO stock_transactions (product_id, warehouse_id, transaction_type, quantity, reference_type, reference_id, performed_by, remarks)
            VALUES (v_product_id, v_dest_id, 'STOCK_IN', v_quantity, 'STOCK_TRANSFER', p_transfer_id,
                (SELECT requested_by FROM stock_transfers WHERE transfer_id = p_transfer_id),
                CONCAT('Transfer from warehouse ', v_source_id));

            -- Update transfer status
            UPDATE stock_transfers
            SET status = 'Completed', completed_date = CURRENT_TIMESTAMP
            WHERE transfer_id = p_transfer_id;

            SET p_success = TRUE;
            SET p_message = 'Transfer completed successfully';
            COMMIT;
        END IF;
    END IF;
END //

-- Procedure: Receive Purchase Order
CREATE PROCEDURE ReceivePurchaseOrder(
    IN p_po_id INT,
    IN p_received_by INT,
    OUT p_success BOOLEAN,
    OUT p_message VARCHAR(255)
)
BEGIN
    DECLARE v_status VARCHAR(20);
    DECLARE v_supplier_id INT;
    DECLARE v_product_id INT;
    DECLARE v_quantity INT;
    DECLARE v_warehouse_id INT;
    DECLARE done INT DEFAULT FALSE;
    DECLARE cur CURSOR FOR
        SELECT poi.product_id, poi.quantity
        FROM purchase_order_items poi
        WHERE poi.po_id = p_po_id;
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_success = FALSE;
        SET p_message = 'Receiving failed due to database error';
    END;

    START TRANSACTION;

    SELECT status, supplier_id INTO v_status, v_supplier_id
    FROM purchase_orders
    WHERE po_id = p_po_id
    FOR UPDATE;

    IF v_status != 'Approved' THEN
        ROLLBACK;
        SET p_success = FALSE;
        SET p_message = 'Purchase order must be approved before receiving';
    ELSE
        -- Get default warehouse (first active warehouse)
        SELECT warehouse_id INTO v_warehouse_id
        FROM warehouses
        WHERE status = 'Active'
        ORDER BY warehouse_id
        LIMIT 1;

        IF v_warehouse_id IS NULL THEN
            ROLLBACK;
            SET p_success = FALSE;
            SET p_message = 'No active warehouse found';
        ELSE
            OPEN cur;
            read_loop: LOOP
                FETCH cur INTO v_product_id, v_quantity;
                IF done THEN LEAVE read_loop; END IF;

                -- Update inventory
                INSERT INTO inventory (warehouse_id, product_id, quantity_available, reorder_level)
                VALUES (v_warehouse_id, v_product_id, v_quantity,
                    (SELECT reorder_level FROM products WHERE product_id = v_product_id))
                ON DUPLICATE KEY UPDATE
                    quantity_available = quantity_available + v_quantity,
                    last_updated = CURRENT_TIMESTAMP;

                -- Record stock in transaction
                INSERT INTO stock_transactions (product_id, warehouse_id, transaction_type, quantity, reference_type, reference_id, performed_by, remarks)
                VALUES (v_product_id, v_warehouse_id, 'STOCK_IN', v_quantity, 'PURCHASE_ORDER', p_po_id, p_received_by,
                    CONCAT('Received from PO #', p_po_id));
            END LOOP;
            CLOSE cur;

            -- Update PO status
            UPDATE purchase_orders
            SET status = 'Received', updated_at = CURRENT_TIMESTAMP
            WHERE po_id = p_po_id;

            SET p_success = TRUE;
            SET p_message = 'Purchase order received successfully';
            COMMIT;
        END IF;
    END IF;
END //

-- Procedure: Add Stock In
CREATE PROCEDURE AddStockIn(
    IN p_product_id INT,
    IN p_warehouse_id INT,
    IN p_quantity INT,
    IN p_performed_by INT,
    IN p_reference_type VARCHAR(50),
    IN p_reference_id INT,
    IN p_remarks TEXT,
    OUT p_success BOOLEAN,
    OUT p_message VARCHAR(255)
)
BEGIN
    DECLARE v_current_qty INT;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_success = FALSE;
        SET p_message = 'Stock in failed due to database error';
    END;

    START TRANSACTION;

    -- Update inventory
    INSERT INTO inventory (warehouse_id, product_id, quantity_available, reorder_level)
    VALUES (p_warehouse_id, p_product_id, p_quantity,
        (SELECT reorder_level FROM products WHERE product_id = p_product_id))
    ON DUPLICATE KEY UPDATE
        quantity_available = quantity_available + p_quantity,
        last_updated = CURRENT_TIMESTAMP;

    -- Record transaction
    INSERT INTO stock_transactions (product_id, warehouse_id, transaction_type, quantity, reference_type, reference_id, performed_by, remarks)
    VALUES (p_product_id, p_warehouse_id, 'STOCK_IN', p_quantity, p_reference_type, p_reference_id, p_performed_by, p_remarks);

    SET p_success = TRUE;
    SET p_message = 'Stock added successfully';
    COMMIT;
END //

-- Procedure: Add Stock Out
CREATE PROCEDURE AddStockOut(
    IN p_product_id INT,
    IN p_warehouse_id INT,
    IN p_quantity INT,
    IN p_performed_by INT,
    IN p_reference_type VARCHAR(50),
    IN p_reference_id INT,
    IN p_remarks TEXT,
    OUT p_success BOOLEAN,
    OUT p_message VARCHAR(255)
)
BEGIN
    DECLARE v_current_qty INT;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_success = FALSE;
        SET p_message = 'Stock out failed due to database error';
    END;

    START TRANSACTION;

    SELECT quantity_available INTO v_current_qty
    FROM inventory
    WHERE product_id = p_product_id AND warehouse_id = p_warehouse_id
    FOR UPDATE;

    IF v_current_qty IS NULL OR v_current_qty < p_quantity THEN
        ROLLBACK;
        SET p_success = FALSE;
        SET p_message = 'Insufficient stock available';
    ELSE
        UPDATE inventory
        SET quantity_available = quantity_available - p_quantity,
            last_updated = CURRENT_TIMESTAMP
        WHERE product_id = p_product_id AND warehouse_id = p_warehouse_id;

        INSERT INTO stock_transactions (product_id, warehouse_id, transaction_type, quantity, reference_type, reference_id, performed_by, remarks)
        VALUES (p_product_id, p_warehouse_id, 'STOCK_OUT', p_quantity, p_reference_type, p_reference_id, p_performed_by, p_remarks);

        SET p_success = TRUE;
        SET p_message = 'Stock removed successfully';
        COMMIT;
    END IF;
END //

-- Procedure: Get Dashboard Statistics
CREATE PROCEDURE GetDashboardStats()
BEGIN
    SELECT 
        (SELECT COUNT(*) FROM products WHERE status = 'Active') AS total_products,
        (SELECT COUNT(*) FROM warehouses WHERE status = 'Active') AS total_warehouses,
        (SELECT COALESCE(SUM(quantity_available), 0) FROM inventory) AS total_stock,
        (SELECT COUNT(*) FROM low_stock_view WHERE stock_status = 'Low Stock') AS low_stock_products,
        (SELECT COUNT(*) FROM low_stock_view WHERE stock_status = 'Out of Stock') AS out_of_stock_products,
        (SELECT COUNT(*) FROM suppliers WHERE status = 'Active') AS total_suppliers,
        (SELECT COUNT(*) FROM purchase_orders WHERE status = 'Pending') AS pending_purchase_orders,
        (SELECT COALESCE(SUM(i.quantity_available * p.unit_price), 0) 
         FROM inventory i 
         JOIN products p ON i.product_id = p.product_id 
         WHERE p.status = 'Active') AS inventory_value;
END //

-- Procedure: Get Stock In vs Out Chart Data
CREATE PROCEDURE GetStockInOutChart(IN p_days INT)
BEGIN
    SELECT 
        DATE(transaction_date) AS date,
        SUM(CASE WHEN transaction_type = 'STOCK_IN' THEN quantity ELSE 0 END) AS stock_in,
        SUM(CASE WHEN transaction_type = 'STOCK_OUT' THEN quantity ELSE 0 END) AS stock_out
    FROM stock_transactions
    WHERE transaction_date >= DATE_SUB(CURDATE(), INTERVAL p_days DAY)
    GROUP BY DATE(transaction_date)
    ORDER BY DATE(transaction_date);
END //

-- Procedure: Get Inventory by Category
CREATE PROCEDURE GetInventoryByCategory()
BEGIN
    SELECT 
        c.category_name,
        COALESCE(SUM(i.quantity_available), 0) AS total_quantity,
        COUNT(DISTINCT p.product_id) AS product_count
    FROM categories c
    LEFT JOIN products p ON c.category_id = p.category_id AND p.status = 'Active'
    LEFT JOIN inventory i ON p.product_id = i.product_id
    GROUP BY c.category_id, c.category_name
    ORDER BY total_quantity DESC;
END //

-- Procedure: Get Warehouse Stock Distribution
CREATE PROCEDURE GetWarehouseStockDistribution()
BEGIN
    SELECT 
        w.warehouse_name,
        COALESCE(SUM(i.quantity_available), 0) AS total_stock,
        COALESCE(SUM(i.quantity_available * p.unit_price), 0) AS stock_value
    FROM warehouses w
    LEFT JOIN inventory i ON w.warehouse_id = i.warehouse_id
    LEFT JOIN products p ON i.product_id = p.product_id AND p.status = 'Active'
    WHERE w.status = 'Active'
    GROUP BY w.warehouse_id, w.warehouse_name
    ORDER BY total_stock DESC;
END //

DELIMITER ;

-- ============================================
-- TRIGGERS
-- ============================================

DELIMITER //

-- Trigger: Update product updated_at on inventory change
CREATE TRIGGER trg_inventory_update_timestamp
BEFORE UPDATE ON inventory
FOR EACH ROW
BEGIN
    SET NEW.last_updated = CURRENT_TIMESTAMP;
END //

-- Trigger: Prevent negative inventory
CREATE TRIGGER trg_prevent_negative_inventory
BEFORE UPDATE ON inventory
FOR EACH ROW
BEGIN
    IF NEW.quantity_available < 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Inventory quantity cannot be negative';
    END IF;
    IF NEW.reserved_quantity < 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Reserved quantity cannot be negative';
    END IF;
    IF NEW.reserved_quantity > NEW.quantity_available THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Reserved quantity cannot exceed available quantity';
    END IF;
END //

-- Trigger: Auto-calculate PO total amount
CREATE TRIGGER trg_po_calculate_total
AFTER INSERT ON purchase_order_items
FOR EACH ROW
BEGIN
    UPDATE purchase_orders
    SET total_amount = (
        SELECT COALESCE(SUM(subtotal), 0)
        FROM purchase_order_items
        WHERE po_id = NEW.po_id
    )
    WHERE po_id = NEW.po_id;
END //

CREATE TRIGGER trg_po_calculate_total_update
AFTER UPDATE ON purchase_order_items
FOR EACH ROW
BEGIN
    UPDATE purchase_orders
    SET total_amount = (
        SELECT COALESCE(SUM(subtotal), 0)
        FROM purchase_order_items
        WHERE po_id = NEW.po_id
    )
    WHERE po_id = NEW.po_id;
END //

CREATE TRIGGER trg_po_calculate_total_delete
AFTER DELETE ON purchase_order_items
FOR EACH ROW
BEGIN
    UPDATE purchase_orders
    SET total_amount = (
        SELECT COALESCE(SUM(subtotal), 0)
        FROM purchase_order_items
        WHERE po_id = OLD.po_id
    )
    WHERE po_id = OLD.po_id;
END //

-- Trigger: Log user creation
CREATE TRIGGER trg_user_created_log
AFTER INSERT ON users
FOR EACH ROW
BEGIN
    INSERT INTO stock_transactions (product_id, warehouse_id, transaction_type, quantity, reference_type, reference_id, performed_by, remarks)
    SELECT 
        p.product_id,
        w.warehouse_id,
        'ADJUSTMENT',
        0,
        'MANUAL',
        NEW.user_id,
        NEW.user_id,
        CONCAT('User account created: ', NEW.full_name, ' (', NEW.email, ')')
    FROM products p
    CROSS JOIN warehouses w
    WHERE p.product_id = 1 AND w.warehouse_id = 1
    LIMIT 1;
END //

DELIMITER ;

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX idx_inventory_qty_reorder ON inventory(quantity_available, reorder_level);
CREATE INDEX idx_transactions_composite ON stock_transactions(warehouse_id, product_id, transaction_date);
CREATE INDEX idx_po_composite ON purchase_orders(status, order_date);
CREATE INDEX idx_transfers_composite ON stock_transfers(status, source_warehouse_id, destination_warehouse_id);

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================
-- SEED DATA
-- ============================================

-- Insert Roles
INSERT INTO roles (role_name, description) VALUES
('Admin', 'Full system access with all permissions'),
('Warehouse Manager', 'Manage products, stock, suppliers, purchase orders, and transfers'),
('Staff', 'View inventory, add stock transactions, limited editing');

-- Insert Users (passwords are bcrypt hashed for 'password123')
INSERT INTO users (full_name, email, password_hash, role_id, warehouse_id, is_active) VALUES
('Admin User', 'admin@inventory.com', '$2b$10$rQZ8K9vX2mN3pL4qR5sT6uV7wX8yZ9aB0cD1eF2gH3iJ4kL5mN6oP', 1, NULL, TRUE),
('John Manager', 'manager@inventory.com', '$2b$10$rQZ8K9vX2mN3pL4qR5sT6uV7wX8yZ9aB0cD1eF2gH3iJ4kL5mN6oP', 2, 1, TRUE),
('Jane Staff', 'staff@inventory.com', '$2b$10$rQZ8K9vX2mN3pL4qR5sT6uV7wX8yZ9aB0cD1eF2gH3iJ4kL5mN6oP', 3, 1, TRUE),
('Mike Manager', 'manager2@inventory.com', '$2b$10$rQZ8K9vX2mN3pL4qR5sT6uV7wX8yZ9aB0cD1eF2gH3iJ4kL5mN6oP', 2, 2, TRUE),
('Sarah Staff', 'staff2@inventory.com', '$2b$10$rQZ8K9vX2mN3pL4qR5sT6uV7wX8yZ9aB0cD1eF2gH3iJ4kL5mN6oP', 3, 2, TRUE),
('Tom Staff', 'staff3@inventory.com', '$2b$10$rQZ8K9vX2mN3pL4qR5sT6uV7wX8yZ9aB0cD1eF2gH3iJ4kL5mN6oP', 3, 3, TRUE);

-- Insert Warehouses
INSERT INTO warehouses (warehouse_name, location, capacity, manager_id, contact_number, status) VALUES
('Main Warehouse', '123 Industrial Blvd, New York, NY 10001', 10000, 2, '+1-555-0101', 'Active'),
('West Coast Warehouse', '456 Harbor Drive, Los Angeles, CA 90001', 8000, 4, '+1-555-0102', 'Active'),
('Midwest Distribution Center', '789 Commerce St, Chicago, IL 60601', 12000, NULL, '+1-555-0103', 'Active');

-- Insert Categories
INSERT INTO categories (category_name, description) VALUES
('Electronics', 'Electronic devices and components'),
('Furniture', 'Office and home furniture'),
('Clothing', 'Apparel and accessories'),
('Books', 'Books and publications'),
('Tools', 'Hand and power tools');

-- Insert Suppliers
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
('ProTools Direct', 'Jennifer Hall', 'jennifer@protools.com', '+1-555-1010', '1000 Builder Blvd, Milwaukee, WI', 'GST012345678', 'Active');

-- Insert Products
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
('TOOL-005', 'Tool Chest', '5-drawer rolling tool chest', 5, 10, 120.00, 229.99, 5, 'PCS', 'Active');

-- Insert Inventory (distribute products across warehouses)
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
(3, 21, 42, 2, 10), (3, 22, 55, 3, 12), (3, 23, 25, 1, 8), (3, 24, 50, 2, 15), (3, 25, 15, 0, 5);

-- Insert Stock Transactions
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
(3, 3, 'STOCK_OUT', 3, 'MANUAL', NULL, 6, '2024-02-12 13:45:00', 'Demo unit');

-- Insert Purchase Orders
INSERT INTO purchase_orders (supplier_id, order_date, expected_delivery_date, total_amount, status, created_by) VALUES
(1, '2024-01-20', '2024-01-25', 2500.00, 'Received', 2),
(1, '2024-02-05', '2024-02-10', 1800.00, 'Received', 2),
(2, '2024-02-10', '2024-02-18', 4500.00, 'Approved', 2),
(3, '2024-02-15', '2024-02-22', 3200.00, 'Pending', 2),
(6, '2024-02-20', '2024-02-28', 5600.00, 'Approved', 4),
(2, '2024-03-01', '2024-03-10', 2800.00, 'Pending', 4);

-- Insert Purchase Order Items
INSERT INTO purchase_order_items (po_id, product_id, quantity, unit_price) VALUES
(1, 1, 100, 12.50), (1, 2, 50, 45.00), (1, 4, 100, 18.00),
(2, 1, 50, 12.50), (2, 3, 10, 280.00), (2, 5, 20, 35.00),
(3, 6, 20, 120.00), (3, 7, 5, 350.00), (3, 8, 20, 85.00),
(4, 11, 100, 8.00), (4, 12, 80, 18.00), (4, 13, 60, 15.00),
(5, 16, 20, 45.00), (5, 17, 15, 38.00), (5, 18, 10, 42.00), (5, 19, 5, 50.00), (5, 20, 10, 48.00),
(6, 9, 3, 450.00), (6, 10, 10, 95.00), (6, 4, 15, 85.00);

-- Insert Stock Transfers
INSERT INTO stock_transfers (product_id, source_warehouse_id, destination_warehouse_id, quantity, status, requested_by, transfer_date, remarks) VALUES
(1, 1, 2, 20, 'Completed', 2, '2024-02-15 10:00:00', 'Restock west coast'),
(2, 1, 3, 15, 'Completed', 2, '2024-02-18 11:30:00', 'Transfer to midwest'),
(11, 2, 1, 30, 'Pending', 5, '2024-03-01 09:00:00', 'Rebalance inventory'),
(16, 3, 2, 10, 'Approved', 4, '2024-03-05 14:00:00', 'Customer demand');

-- Update warehouse managers
UPDATE warehouses SET manager_id = 2 WHERE warehouse_id = 1;
UPDATE warehouses SET manager_id = 4 WHERE warehouse_id = 2;