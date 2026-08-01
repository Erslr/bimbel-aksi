// routes/pembayaran.routes.js
const express = require('express');
const router = express.Router();

// ==============================
// IMPORT CONTROLLER & MIDDLEWARE
// ==============================
const pembayaranController = require('../controllers/pembayaran.controller');
const auth = require('../middleware/auth.middleware');

// ==============================
// ROUTES PEMBAYARAN (ADMIN)
// ==============================
router.get('/', auth, pembayaranController.index);

router.post(
  '/bayar/:id',
  auth,
  pembayaranController.bayar
);

router.get(
  '/export/excel',
  auth,
  pembayaranController.exportExcel
);

// ==============================
// RIWAYAT PEMBAYARAN SISWA
// ==============================
router.get(
  '/riwayat/:id',
  auth,
  pembayaranController.riwayatSiswa
);

router.get(
  '/riwayat/:id/export',
  auth,
  pembayaranController.exportRiwayatSiswa
);

// ==============================
// WHATSAPP
// ==============================
router.get(
  '/whatsapp/preview',
  auth,
  pembayaranController.previewWhatsapp
);

router.post(
  '/whatsapp/update-pesan/:id',
  auth,
  pembayaranController.updateCustomPesan
);

router.post(
  '/whatsapp/tandai/:id',
  auth,
  pembayaranController.tandaiWhatsapp
);

router.post(
  '/whatsapp/kirim/:id',
  auth,
  pembayaranController.kirimWhatsapp
);

// ==============================
// VERIFIKASI PEMBAYARAN
// ==============================
router.post(
  '/verifikasi/:id',
  auth,
  pembayaranController.verifikasiPembayaran
);

// ==============================
// GENERATE TAGIHAN
// ==============================
router.post(
  '/generate',
  auth,
  pembayaranController.generateTagihan
);

// ==============================
// EXPORT ROUTER
// ==============================
module.exports = router;