const express = require('express');
const router = express.Router();

const auth = require('../middleware/auth.middleware');
const db = require('../config/database');

const pembayaranController = require('../controllers/pembayaran.controller');


// ==============================
// HALAMAN VERIFIKASI
// ==============================
router.get('/verifikasi', auth, (req, res) => {

  const query = `
    SELECT 
      p.*,
      s.nama_lengkap,
      s.harga_bulanan AS jumlah

    FROM pembayaran p

    JOIN siswa s
      ON p.id_siswa = s.id_siswa

    WHERE p.status = 'menunggu'

    ORDER BY p.tanggal_bayar ASC
  `;

  db.query(query, (err, results) => {

    if (err) {
      return res.send('Gagal ambil data');
    }

    res.render(
      'admin/pembayaran/verifikasi',
      {
        pembayaran: results,
        admin: req.session.admin,
        activePage: 'verifikasi'
      }
    );

  });

});


// ==============================
// ACC PEMBAYARAN
// ==============================
router.post(
  '/verifikasi/:id',
  auth,
  pembayaranController.verifikasiPembayaran
);


module.exports = router;