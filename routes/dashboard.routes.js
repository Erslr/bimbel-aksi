const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const auth = require('../middleware/auth.middleware');

router.get('/dashboard', auth, dashboardController.index);

// ====================== NOTIFIKASI SISWA BARU ======================
router.get('/notif/pendaftar-baru', auth, dashboardController.notifPendaftarBaru);
module.exports = router;
