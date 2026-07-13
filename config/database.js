// config/database.js
const mysql = require('mysql2');

console.log("========== DATABASE ENV ==========");
console.log("DB_HOST:", process.env.DB_HOST);
console.log("DB_PORT:", process.env.DB_PORT);
console.log("DB_USER:", process.env.DB_USER);
console.log("DB_NAME:", process.env.DB_NAME);
console.log("DB_PASSWORD:", process.env.DB_PASSWORD ? "ADA" : "TIDAK ADA");
console.log("=================================");

// ==============================
// CREATE CONNECTION POOL
// ==============================
const db = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,

  waitForConnections: true,
  connectionLimit: 10,
  maxIdle: 10,
  idleTimeout: 60000,
  queueLimit: 0,

  charset: 'utf8mb4'
});

// ==============================
// TEST CONNECTION
// ==============================
db.getConnection((err, connection) => {

  if (err) {

    console.error("Koneksi database gagal ❌", err);

  } else {

    console.log("Database MySQL terhubung ✅");

    connection.query("SET NAMES utf8mb4");
    connection.query("SET CHARACTER SET utf8mb4");
    connection.query("SET character_set_connection=utf8mb4");

    connection.release();
  }

});

module.exports = db;