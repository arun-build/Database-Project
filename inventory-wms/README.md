# Inventory & Warehouse Management System

A full-stack Inventory & Warehouse Management System built as a college-level DBMS project with professional modern UI, authentication, role-based access, MySQL database, and comprehensive features.

## 🚀 Tech Stack

### Frontend
- **React.js 18** with Vite
- **Tailwind CSS** for styling
- **React Router v6** for navigation
- **Axios** for API communication
- **Lucide React** for icons
- **Recharts** for analytics/charts
- **React Hot Toast** for notifications

### Backend
- **Node.js** with Express.js
- **RESTful APIs** with proper HTTP status codes
- **JWT Authentication** with bcrypt password hashing
- **Role-based Access Control** (Admin, Warehouse Manager, Staff)
- **MySQL2** for database connectivity
- **Helmet** for security headers
- **Morgan** for logging

### Database
- **MySQL 8.0+** with proper normalization (3NF)
- **Primary Keys, Foreign Keys, Constraints**
- **Indexes** for performance
- **Views** for common queries
- **Stored Procedures** for business logic
- **Triggers** for data integrity
- **Transactions** for consistency

## ✨ Features

### Authentication System
- Secure login/registration with JWT
- Bcrypt password hashing
- Role-based access control
- Protected routes and authorization middleware

### User Roles
| Role | Permissions |
|------|-------------|
| **Admin** | Full system access, manage users, warehouses, products, suppliers, categories, view all reports |
| **Warehouse Manager** | Manage products/stock, suppliers, purchase orders, stock transfers, view reports |
| **Staff** | View inventory, add stock transactions, view assigned warehouse |

### Core Modules
- **Dashboard** - Statistics, charts, recent activity, alerts
- **Products** - CRUD, search, filter, pagination, detail view
- **Categories** - CRUD with product counts
- **Warehouses** - CRUD, capacity management, utilization tracking
- **Inventory** - Warehouse-wise stock, status badges, stock in/out
- **Suppliers** - CRUD, products supplied, purchase order history
- **Purchase Orders** - Full lifecycle (Pending → Approved → Received)
- **Stock Transfers** - Inter-warehouse transfers with approval workflow
- **Reports** - Multiple report types with CSV export
- **User Management** - Admin-only user administration

### Database Features (DBMS Focus)
- **Views**: `low_stock_view`, `warehouse_inventory_view`, `inventory_value_view`, `product_transaction_view`, `monthly_purchase_trends`
- **Stored Procedures**: `GetLowStockProducts()`, `GetWarehouseInventory()`, `TransferStock()`, `CompleteStockTransfer()`, `ReceivePurchaseOrder()`, `AddStockIn()`, `AddStockOut()`, `GetDashboardStats()`
- **Triggers**: Inventory timestamp updates, negative prevention, PO total calculation, user creation logging
- **Transactions**: Stock transfers, purchase order receiving, stock adjustments
- **Indexes**: Composite and single-column for query optimization

## 📋 Prerequisites

- **Node.js** 18+
- **MySQL** 8.0+
- **npm** or **yarn**

## 🛠 Installation

### 1. Clone and Setup
```bash
cd inventory-wms
```

### 2. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
```

### 3. Configure Database
Edit `.env` with your MySQL credentials:
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=inventory_wms
JWT_SECRET=your_super_secret_jwt_key_change_in_production
JWT_EXPIRES_IN=24h
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

### 4. Initialize Database
```bash
# Create database, tables, views, procedures, triggers, and seed data
npm run db:init
```

### 5. Frontend Setup
```bash
cd ../frontend
npm install
```

## 🚀 Running the Application

### Development Mode

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
# Server runs on http://localhost:5000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
# Frontend runs on http://localhost:5173
```

### Production Build
```bash
cd frontend
npm run build
# Output in dist/ folder
```

## 🔐 Demo Accounts

After running `npm run db:init`, these accounts are available:

| Role | Email | Password |
|------|-------|----------|
| **Admin** | admin@inventory.com | password123 |
| **Warehouse Manager** | manager@inventory.com | password123 |
| **Staff** | staff@inventory.com | password123 |
| **Warehouse Manager** | manager2@inventory.com | password123 |
| **Staff** | staff2@inventory.com | password123 |
| **Staff** | staff3@inventory.com | password123 |

## 📁 Project Structure

```
inventory-wms/
├── backend/
│   ├── config/
│   │   └── database.js          # MySQL connection pool
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── categoryController.js
│   │   ├── inventoryController.js
│   │   ├── productController.js
│   │   ├── purchaseOrderController.js
│   │   ├── reportController.js
│   │   ├── supplierController.js
│   │   ├── transferController.js
│   │   ├── userController.js
│   │   └── warehouseController.js
│   ├── middleware/
│   │   ├── auth.js              # JWT authentication & authorization
│   │   └── validation.js        # Express-validator rules
│   ├── routes/
│   │   ├── auth.js
│   │   ├── categories.js
│   │   ├── inventory.js
│   │   ├── products.js
│   │   ├── purchaseOrders.js
│   │   ├── reports.js
│   │   ├── suppliers.js
│   │   ├── transfers.js
│   │   ├── users.js
│   │   └── warehouses.js
│   ├── sql/
│   │   └── schema.sql           # Complete database schema
│   ├── utils/
│   │   └── initDatabase.js      # Database initialization script
│   ├── .env.example
│   ├── package.json
│   └── server.js                # Express app entry point
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Layout.jsx       # Sidebar, header, navigation
│   │   │   └── ProtectedRoute.jsx
│   │   ├── context/
│   │   │   └── AuthContext.jsx  # Authentication state management
│   │   ├── lib/
│   │   │   └── api.js           # Axios instance with interceptors
│   │   ├── pages/
│   │   │   ├── Categories.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Inventory.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── Products.jsx
│   │   │   ├── PurchaseOrders.jsx
│   │   │   ├── Reports.jsx
│   │   │   ├── Suppliers.jsx
│   │   │   ├── Transfers.jsx
│   │   │   ├── Users.jsx
│   │   │   └── Warehouses.jsx
│   │   ├── App.jsx              # Main app with routing
│   │   ├── index.css            # Tailwind + custom components
│   │   └── main.jsx             # Entry point
│   ├── index.html
│   ├── package.json
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   └── vite.config.js
│
└── README.md
```

## 🔌 API Endpoints

### Authentication
```
POST   /api/auth/register       # Register new user
POST   /api/auth/login          # Login
GET    /api/auth/me             # Get current user
PUT    /api/auth/change-password # Change password
```

### Products
```
GET    /api/products            # List products (paginated, filtered)
GET    /api/products/:id        # Get product with inventory & transactions
POST   /api/products            # Create product (Admin, Manager)
PUT    /api/products/:id        # Update product (Admin, Manager)
DELETE /api/products/:id        # Delete product (Admin)
```

### Categories
```
GET    /api/categories          # List categories
POST   /api/categories          # Create category (Admin, Manager)
PUT    /api/categories/:id      # Update category (Admin, Manager)
DELETE /api/categories/:id      # Delete category (Admin)
```

### Warehouses
```
GET    /api/warehouses          # List warehouses
GET    /api/warehouses/:id      # Get warehouse with inventory
POST   /api/warehouses          # Create warehouse (Admin)
PUT    /api/warehouses/:id      # Update warehouse (Admin)
DELETE /api/warehouses/:id      # Delete warehouse (Admin)
```

### Inventory
```
GET    /api/inventory           # List inventory (warehouse-scoped for Staff)
GET    /api/inventory/warehouse/:id  # Warehouse-specific inventory
POST   /api/inventory/stock-in  # Add stock (all roles)
POST   /api/inventory/stock-out # Remove stock (all roles)
GET    /api/inventory/transactions  # Transaction history
```

### Suppliers
```
GET    /api/suppliers           # List suppliers
GET    /api/suppliers/:id       # Get supplier with products & POs
POST   /api/suppliers           # Create supplier (Admin, Manager)
PUT    /api/suppliers/:id       # Update supplier (Admin, Manager)
DELETE /api/suppliers/:id       # Delete supplier (Admin)
```

### Purchase Orders
```
GET    /api/purchase-orders     # List POs
GET    /api/purchase-orders/:id # Get PO with items
POST   /api/purchase-orders     # Create PO (Admin, Manager)
PUT    /api/purchase-orders/:id/status  # Update status (Admin, Manager)
```

### Stock Transfers
```
GET    /api/transfers           # List transfers
POST   /api/transfers           # Create transfer request (all roles)
PUT    /api/transfers/:id/approve   # Approve transfer (Admin, Manager)
PUT    /api/transfers/:id/complete  # Complete transfer (Admin, Manager)
PUT    /api/transfers/:id/cancel    # Cancel transfer (all roles)
```

### Reports
```
GET    /api/reports/dashboard/stats     # Dashboard statistics
GET    /api/reports/dashboard/charts    # Chart data
GET    /api/reports/low-stock           # Low stock report
GET    /api/reports/inventory-value     # Inventory valuation
GET    /api/reports/transactions        # Transaction report
GET    /api/reports/purchase-orders     # PO report
GET    /api/reports/export              # Export to CSV
```

### Users (Admin only)
```
GET    /api/users               # List users
GET    /api/users/roles         # Get roles
POST   /api/users               # Create user
PUT    /api/users/:id           # Update user
DELETE /api/users/:id           # Delete user
```

## 🗄 Database Schema

Key tables with relationships:

```
roles (1) ─────< users >───── (1) warehouses
                    │
                    ├─< stock_transactions
                    ├─< purchase_orders (created_by)
                    └─< stock_transfers (requested_by/approved_by)

categories (1) ─────< products >───── (1) suppliers
                              │
                              ├─< inventory >───── (1) warehouses
                              ├─< stock_transactions
                              ├─< purchase_order_items
                              └─< stock_transfers

purchase_orders (1) ─────< purchase_order_items >───── (1) products
                              │
                              └─< stock_transactions (when received)

stock_transfers >───── (1) warehouses (source)
stock_transfers >───── (1) warehouses (destination)
```

## 🎯 DBMS Concepts Demonstrated

This project showcases advanced SQL concepts suitable for a college DBMS viva:

1. **Normalization (3NF)** - All tables properly normalized
2. **Constraints** - PK, FK, UNIQUE, NOT NULL, CHECK
3. **Indexes** - Single, composite, full-text for search
4. **Views** - 5 views for common reporting queries
5. **Stored Procedures** - 8 procedures with parameters, transactions, cursors
6. **Triggers** - 6 triggers for data integrity and automation
7. **Transactions** - ACID compliance for stock operations
8. **Joins** - INNER, LEFT, CROSS in views and queries
9. **Subqueries** - In procedures and view definitions
10. **Aggregate Functions** - COUNT, SUM, AVG with GROUP BY, HAVING

## 🧪 Testing the Database

Run these queries in MySQL to verify DBMS features:

```sql
-- Test Views
SELECT * FROM low_stock_view;
SELECT * FROM warehouse_inventory_view;
SELECT * FROM inventory_value_view;
SELECT * FROM monthly_purchase_trends;

-- Test Stored Procedures
CALL GetDashboardStats();
CALL GetLowStockProducts(NULL);
CALL GetWarehouseInventory(1);

-- Test Triggers
INSERT INTO purchase_order_items (po_id, product_id, quantity, unit_price) VALUES (1, 1, 10, 12.50);
-- Check if PO total_amount updated automatically

-- Test Transactions (manual)
START TRANSACTION;
CALL AddStockIn(1, 1, 50, 1, 'MANUAL', NULL, 'Test');
COMMIT;
```

## 🐛 Troubleshooting

### Database Connection Failed
- Ensure MySQL is running: `sudo service mysql start` (Linux) or start MySQL service (Windows)
- Verify credentials in `.env`
- Check if database exists: `SHOW DATABASES;`

### Port Already in Use
- Backend: Change `PORT` in `.env`
- Frontend: Vite will auto-select next available port

### CORS Errors
- Ensure `FRONTEND_URL` in backend `.env` matches frontend URL
- Check Vite proxy config in `vite.config.js`

### Build Errors
- Clear node_modules and reinstall: `rm -rf node_modules package-lock.json && npm install`
- Ensure Node.js 18+ is used

## 📝 License

This project is created for educational purposes as a college DBMS semester project.

## 👨‍💻 Author

Built for BTech CSE DBMS Course Project

---

**Note**: This is a demonstration project. For production use, implement additional security measures (rate limiting, input sanitization, HTTPS, secure JWT secrets, etc.).