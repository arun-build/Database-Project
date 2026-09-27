/**
 * ============================================================================
 * STOCK TRANSFERS SQL QUERIES
 * ============================================================================
 * This file contains all SQL queries for Inter-Warehouse Stock Transfers.
 * 
 * Concept:
 * Stock transfers move inventory units from a Source Warehouse to a Destination Warehouse.
 * - Workflow:
 *     1. Requested (Status: 'Pending') -> User initiates the request
 *     2. Approved (Status: 'Approved') -> Manager verifies source stock availability
 *     3. Completed (Status: 'Completed') -> Atomic deduction from source and addition to destination
 * - Atomicity is guaranteed using stored procedures and ACID transactions.
 * ============================================================================
 */

const transferQueries = {
  /**
   * 1. Base query for listing stock transfers with all warehouse and user details.
   * Joins:
   *   - products p (product details)
   *   - warehouses sw (Source warehouse)
   *   - warehouses dw (Destination warehouse)
   *   - users req_u (User who requested the transfer)
   *   - users app_u (Manager who approved the transfer, LEFT JOIN because pending transfers are unapproved)
   */
  baseTransferSelect: `
    SELECT 
      st.transfer_id,
      st.product_id,
      p.sku,
      p.product_name,
      st.source_warehouse_id,
      sw.warehouse_name AS source_warehouse_name,
      st.destination_warehouse_id,
      dw.warehouse_name AS destination_warehouse_name,
      st.quantity,
      st.status,
      st.requested_by,
      req_u.full_name AS requested_by_name,
      st.approved_by,
      app_u.full_name AS approved_by_name,
      st.transfer_date,
      st.completed_date,
      st.remarks
    FROM stock_transfers st
    INNER JOIN products p ON st.product_id = p.product_id
    INNER JOIN warehouses sw ON st.source_warehouse_id = sw.warehouse_id
    INNER JOIN warehouses dw ON st.destination_warehouse_id = dw.warehouse_id
    INNER JOIN users req_u ON st.requested_by = req_u.user_id
    LEFT JOIN users app_u ON st.approved_by = app_u.user_id
  `,

  /**
   * 2. Find a single stock transfer by its ID.
   * Parameter: [transfer_id]
   */
  findById: `
    SELECT 
      st.transfer_id,
      st.product_id,
      p.sku,
      p.product_name,
      st.source_warehouse_id,
      sw.warehouse_name AS source_warehouse_name,
      st.destination_warehouse_id,
      dw.warehouse_name AS destination_warehouse_name,
      st.quantity,
      st.status,
      st.requested_by,
      req_u.full_name AS requested_by_name,
      st.approved_by,
      app_u.full_name AS approved_by_name,
      st.transfer_date,
      st.completed_date,
      st.remarks
    FROM stock_transfers st
    INNER JOIN products p ON st.product_id = p.product_id
    INNER JOIN warehouses sw ON st.source_warehouse_id = sw.warehouse_id
    INNER JOIN warehouses dw ON st.destination_warehouse_id = dw.warehouse_id
    INNER JOIN users req_u ON st.requested_by = req_u.user_id
    LEFT JOIN users app_u ON st.approved_by = app_u.user_id
    WHERE st.transfer_id = ?
  `,

  /**
   * 3. Insert a new pending stock transfer request.
   * Parameters: [product_id, source_warehouse_id, destination_warehouse_id, quantity, requested_by, remarks]
   */
  create: `
    INSERT INTO stock_transfers (
      product_id, 
      source_warehouse_id, 
      destination_warehouse_id, 
      quantity, 
      status, 
      requested_by, 
      remarks
    )
    VALUES (?, ?, ?, ?, 'Pending', ?, ?)
  `,

  /**
   * 4. Call procedure to approve a pending transfer request.
   * Parameters: [transfer_id, approved_by_user_id]
   */
  callApproveTransfer: 'CALL ApproveStockTransfer(?, ?, @success, @message)',

  /**
   * 5. Call procedure to complete transfer (executes stock deduction and addition).
   * Parameter: [transfer_id]
   */
  callCompleteTransfer: 'CALL CompleteStockTransfer(?, @success, @message)',

  /**
   * 6. Retrieve procedure output.
   */
  getProcedureOutput: 'SELECT @success AS success, @message AS message'
};

module.exports = transferQueries;