// ======================================================
// routes/pembayaran.routes.js
// ======================================================

const express = require('express');
const router = express.Router();


// ======================================================
// IMPORT CONTROLLER
// ======================================================

const pembayaranController =
  require('../controllers/pembayaran.controller');


// ======================================================
// IMPORT MIDDLEWARE
// ======================================================

const auth =
  require('../middleware/auth.middleware');


// ======================================================
// HALAMAN PEMBAYARAN
// ======================================================

router.get(
  '/',
  auth,
  pembayaranController.index
);


// ======================================================
// BAYAR PEMBAYARAN
// ======================================================

router.post(
  '/bayar/:id',
  auth,
  pembayaranController.bayar
);


// ======================================================
// EXPORT PDF
// ======================================================

router.get(
  '/export/pdf',
  auth,
  pembayaranController.exportPDF
);


// ======================================================
// KWITANSI PEMBAYARAN
// ======================================================

router.get(
  '/kwitansi/:id',
  auth,
  pembayaranController.kwitansiPembayaran
);


// ======================================================
// RIWAYAT PEMBAYARAN SISWA
// ======================================================

router.get(
  '/riwayat/:id',
  auth,
  pembayaranController.riwayatSiswa
);


// ======================================================
// EXPORT PDF RIWAYAT PEMBAYARAN SISWA
// ======================================================

router.get(
  '/riwayat/:id/export',
  auth,
  pembayaranController.exportRiwayatPDF
);


// ======================================================
// WHATSAPP - PREVIEW
// ======================================================

router.get(
  '/whatsapp/preview',
  auth,
  pembayaranController.previewWhatsapp
);


// ======================================================
// WHATSAPP - UPDATE PESAN
// ======================================================

router.post(
  '/whatsapp/update-pesan/:id',
  auth,
  pembayaranController.updateCustomPesan
);


// ======================================================
// WHATSAPP - TANDAI TERKIRIM
// ======================================================

router.post(
  '/whatsapp/tandai/:id',
  auth,
  pembayaranController.tandaiWhatsapp
);


// ======================================================
// WHATSAPP - KIRIM
// ======================================================

router.post(
  '/whatsapp/kirim/:id',
  auth,
  pembayaranController.kirimWhatsapp
);


// ======================================================
// VERIFIKASI PEMBAYARAN
// ======================================================

router.post(
  '/verifikasi/:id',
  auth,
  pembayaranController.verifikasiPembayaran
);

router.get(
  '/download-kwitansi/:namaFile',
  pembayaranController.downloadKwitansi
);

// ======================================================
// GENERATE TAGIHAN
// ======================================================

router.post(
  '/generate',
  auth,
  pembayaranController.generateTagihan
);


// ======================================================
// EXPORT ROUTER
// ======================================================

module.exports = router;