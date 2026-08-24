const express = require('express');

const router = express.Router();

const settingController =
  require('../controllers/setting.controller');

const authMiddleware =
  require('../middleware/auth.middleware');


// ======================================================
// HALAMAN UTAMA SETTING
// ======================================================

// /setting
router.get(
  '/setting',
  authMiddleware,
  settingController.index
);


// ======================================================
// HALAMAN AKUN SAYA
// ======================================================

// /setting/akun
router.get(
  '/setting/akun',
  authMiddleware,
  settingController.akun
);


// ======================================================
// UPDATE PROFIL AKUN SAYA
// ======================================================

// /setting/profil
router.post(
  '/setting/profil',
  authMiddleware,
  settingController.updateProfil
);


// ======================================================
// UBAH PASSWORD AKUN SAYA
// ======================================================

// /setting/password
router.post(
  '/setting/password',
  authMiddleware,
  settingController.updatePassword
);


// ======================================================
// HALAMAN MANAJEMEN ADMIN
// ======================================================

// /setting/admin
router.get(
  '/setting/admin',
  authMiddleware,
  settingController.manajemenAdmin
);


// ======================================================
// TAMBAH ADMIN
// ======================================================

// /setting/admin/tambah
router.post(
  '/setting/admin/tambah',
  authMiddleware,
  settingController.tambahAdmin
);


// ======================================================
// EDIT ADMIN
// ======================================================

// /setting/admin/edit/:id
router.post(
  '/setting/admin/edit/:id',
  authMiddleware,
  settingController.editAdmin
);


// ======================================================
// HAPUS ADMIN
// ======================================================

// /setting/admin/hapus/:id
router.post(
  '/setting/admin/hapus/:id',
  authMiddleware,
  settingController.hapusAdmin
);


// ======================================================
// RESET PASSWORD ADMIN
// ======================================================

// /setting/admin/reset-password/:id
router.post(
  '/setting/admin/reset-password/:id',
  authMiddleware,
  settingController.resetPasswordAdmin
);


module.exports = router;