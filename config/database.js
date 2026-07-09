// config/database.js
const mysql = require('mysql2');

// koneksi database menggunakan .env
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,

  charset: 'utf8mb4',
});

// 🔥 TAMBAHAN PENTING BANGET
db.query("SET NAMES utf8mb4");
db.query("SET CHARACTER SET utf8mb4");
db.query("SET character_set_connection=utf8mb4");

// cek koneksi
db.connect((err) => {
  if (err) {
    console.error('Koneksi database gagal ❌:', err);
  } else {
    console.log('Database MySQL terhubung ✅');
  }
});

module.exports = db;
