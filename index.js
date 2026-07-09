// =====================================
// LOAD ENV
// =====================================
require('dotenv').config();

// =====================================
// IMPORT MODULE
// =====================================
const express = require('express');
const session = require('express-session');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

// =====================================
// IMPORT SERVICES
// =====================================
const generatePembayaran = require('./services/generatePembayaran');

// =====================================
// IMPORT ROUTES
// =====================================
const authRoutes = require('./routes/auth.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const siswaRoutes = require('./routes/siswa.routes');
const pendaftaranRoutes = require('./routes/pendaftaran.routes');
const kelasRoutes = require('./routes/kelas.routes');
const tentorRoutes = require('./routes/tentor.routes');
const pembayaranRoutes = require('./routes/pembayaran.routes');
const adminPembayaranRoutes = require('./routes/admin.pembayaran.routes');

// =====================================
// INIT APP
// =====================================
const app = express();
const server = http.createServer(app);

// =====================================
// SOCKET.IO
// =====================================
const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

app.set('io', io);

// =====================================
// VIEW ENGINE
// =====================================
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// =====================================
// 🔥 MIDDLEWARE (FIX PENTING)
// =====================================

// 🔥 GANTI body-parser → express bawaan (LEBIH STABIL)
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// static file
app.use(express.static(path.join(__dirname, 'public')));

// =====================================
// SESSION CONFIG
// =====================================
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'bimbel-aksi-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 // 1 hari
    }
  })
);

// =====================================
// ROOT
// =====================================
app.get('/', (req, res) => {
  if (req.session.user) {
    res.redirect('/dashboard');
  } else {
    res.redirect('/login');
  }
});

// =====================================
// 🔧 DEBUG GENERATE PEMBAYARAN
// =====================================
app.get('/debug/generate-pembayaran', (req, res) => {
  generatePembayaran();

  res.send(`
    <h2>✅ Generate Pembayaran Berhasil</h2>
    <p>Tagihan sampai bulan depan sudah digenerate.</p>
    <ul>
      <li>✔ Cek halaman Pembayaran</li>
      <li>✔ Cek Preview WhatsApp</li>
      <li>✔ Cek database tabel pembayaran</li>
    </ul>
    <a href="/pembayaran">➡️ Ke Halaman Pembayaran</a>
  `);
});

// =====================================
// ROUTES
// =====================================
app.use(authRoutes);
app.use(dashboardRoutes);
app.use('/siswa', siswaRoutes);
app.use('/pendaftaran-siswa', pendaftaranRoutes);
app.use('/kelas', kelasRoutes);
app.use('/tentor', tentorRoutes);
app.use('/pembayaran', pembayaranRoutes);
app.use('/admin/pembayaran', adminPembayaranRoutes);

// =====================================
// SOCKET.IO EVENTS
// =====================================
let onlineUsers = {};

io.on('connection', (socket) => {

  console.log('User connected:', socket.id);

  socket.on('register', (data) => {
    if (data?.userId) {
      onlineUsers[data.userId] = socket.id;
    }
  });

  socket.on('disconnect', () => {
    for (let id in onlineUsers) {
      if (onlineUsers[id] === socket.id) {
        delete onlineUsers[id];
      }
    }
    console.log('User disconnected:', socket.id);
  });

});

// =====================================
// START SERVER
// =====================================
const PORT = process.env.APP_PORT || 3000;

server.listen(PORT, () => {
  console.log(`🚀 Server berjalan di http://localhost:${PORT}`);
});