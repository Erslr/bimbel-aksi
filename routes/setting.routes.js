const express = require('express');
const router = express.Router();

const settingController =
  require('../controllers/setting.controller');

const authMiddleware =
  require('../middleware/auth.middleware');


// ==========================================
// HALAMAN SETTING
// ==========================================

router.get(
  '/setting',
  authMiddleware,
  settingController.index
);


// ==========================================
// UPDATE PROFIL
// ==========================================

router.post(
  '/setting/profil',
  authMiddleware,
  settingController.updateProfil
);


// ==========================================
// UPDATE PASSWORD
// ==========================================

router.post(
  '/setting/password',
  authMiddleware,
  settingController.updatePassword
);


module.exports = router;