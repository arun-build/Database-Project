const mysql = require('mysql2/promise');
require('dotenv').config();

function createPool(database) {
  let dbName = database;
  if (dbName === undefined || dbName === null) {
    dbName = process.env.DB_NAME || 'inventory_wms';
  }
  if (dbName === '') {
    dbName = undefined;
  }
  return mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: dbName,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    timezone: '+00:00'
  });
}

const pool = createPool();

pool.on('error', (err) => {
  console.error('Database pool error:', err);
});

async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('Database connected successfully');
    connection.release();
    return true;
  } catch (error) {
    console.error('Database connection failed:', error.message);
    return false;
  }
}

async function testConnectionNoDatabase() {
  const tempPool = createPool(undefined);
  try {
    const connection = await tempPool.getConnection();
    console.log('Connected to MySQL server (no database)');
    connection.release();
    await tempPool.end();
    return true;
  } catch (error) {
    console.error('MySQL server connection failed:', error.message);
    await tempPool.end();
    return false;
  }
}

module.exports = {
  pool,
  testConnection,
  testConnectionNoDatabase,
  createPool
};