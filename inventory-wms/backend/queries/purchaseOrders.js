/**
 * ============================================================================
 * PURCHASE ORDERS SQL QUERIES
 * ============================================================================
 * This file contains all SQL queries for Purchase Order procurement workflow.
 * 
 * Concept:
 * A Purchase Order (PO) tracks goods ordered from an external Supplier.
 * - Header: `purchase_orders` (po_id, supplier_id, total_amount, status, created_by)
 * - Line Items: `purchase_order_items` (po_id, product_id, quantity, unit_price, subtotal)
 * - Lifecycle: Pending -> Approved -> Received (or Cancelled)
 * - Receiving: Triggers the `ReceivePurchaseOrder` procedure which adds goods to inventory.
 * ============================================================================
 */

const purchaseOrderQueries = {
  /**
   * 1. Base query for listing purchase orders with supplier name and creator name.
   * Formats a display PO number like 'PO-00001' from po_id.
   */
  basePurchaseOrderSelect: `
    SELECT 
      po.po_id,
      CONCAT('PO-', LPAD(po.po_id, 5, '0')) AS po_number,
      po.supplier_id,
      s.supplier_name,
      po.order_date,
      po.expected_delivery_date,
      po.total_amount,
      po.status,
      po.created_by,
      u.full_name AS created_by_name,
      po.created_at,
      po.updated_at,
      (SELECT COUNT(*) FROM purchase_order_items poi WHERE poi.po_id = po.po_id) AS item_count
    FROM purchase_orders po
    INNER JOIN suppliers s ON po.supplier_id = s.supplier_id
    INNER JOIN users u ON po.created_by = u.user_id
  `,

  /**
   * 2. Find a specific Purchase Order by ID.
   * Parameter: [po_id]
   */
  findById: `
    SELECT 
      po.po_id,
      CONCAT('PO-', LPAD(po.po_id, 5, '0')) AS po_number,
      po.supplier_id,
      s.supplier_name,
      s.contact_person,
      s.email AS supplier_email,
      s.phone AS supplier_phone,
      po.order_date,
      po.expected_delivery_date,
      po.total_amount,
      po.status,
      po.created_by,
      u.full_name AS created_by_name,
      po.created_at,
      po.updated_at
    FROM purchase_orders po
    INNER JOIN suppliers s ON po.supplier_id = s.supplier_id
    INNER JOIN users u ON po.created_by = u.user_id
    WHERE po.po_id = ?
  `,

  /**
   * 3. Get all line items for a specific Purchase Order.
   * Parameter: [po_id]
   */
  findItemsByPoId: `
    SELECT 
      poi.item_id,
      poi.po_id,
      poi.product_id,
      p.sku,
      p.product_name,
      p.unit_type,
      poi.quantity,
      poi.unit_price,
      poi.subtotal
    FROM purchase_order_items poi
    INNER JOIN products p ON poi.product_id = p.product_id
    WHERE poi.po_id = ?
    ORDER BY poi.item_id ASC
  `,

  /**
   * 4. Insert a new Purchase Order header.
   * Parameters: [supplier_id, order_date, expected_delivery_date, total_amount, status, created_by]
   */
  createOrder: `
    INSERT INTO purchase_orders (
      supplier_id, 
      order_date, 
      expected_delivery_date, 
      total_amount, 
      status, 
      created_by
    )
    VALUES (?, ?, ?, ?, ?, ?)
  `,

  /**
   * 5. Insert a line item into purchase_order_items.
   * Parameters: [po_id, product_id, quantity, unit_price, subtotal]
   */
  createOrderItem: `
    INSERT INTO purchase_order_items (
      po_id, 
      product_id, 
      quantity, 
      unit_price, 
      subtotal
    )
    VALUES (?, ?, ?, ?, ?)
  `,

  /**
   * 6. Recalculate and update the total amount of a PO from its line items.
   * Parameter: [po_id, po_id]
   */
  updateTotalAmount: `
    UPDATE purchase_orders 
    SET total_amount = (
      SELECT COALESCE(SUM(subtotal), 0) 
      FROM purchase_order_items 
      WHERE po_id = ?
    ) 
    WHERE po_id = ?
  `,

  /**
   * 7. Update status of a Purchase Order (Pending -> Approved / Received / Cancelled).
   * Parameters: [status, po_id]
   */
  updateStatus: `
    UPDATE purchase_orders 
    SET status = ?, updated_at = CURRENT_TIMESTAMP 
    WHERE po_id = ?
  `,

  /**
   * 8. Call stored procedure to receive goods into inventory.
   * Parameters: [po_id, received_by_user_id]
   */
  callReceivePO: 'CALL ReceivePurchaseOrder(?, ?, @success, @message)',

  /**
   * 9. Retrieve stored procedure outcome.
   */
  getProcedureOutput: 'SELECT @success AS success, @message AS message'
};

module.exports = purchaseOrderQueries;