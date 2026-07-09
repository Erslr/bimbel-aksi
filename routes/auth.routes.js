const express = require('express');
const router = express.Router();

const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middleware/auth.middleware');

/**
 * =========================
 * AUTHENTICATION ROUTES
 * =========================
 */

// =========================
// LOGIN
// =========================

// Tampilkan halaman login
router.get('/login', authController.showLogin);

// Proses login admin
router.post('/login', authController.login);

// =========================
// LOGOUT (HARUS SUDAH LOGIN)
// =========================
router.get('/logout', authMiddleware, authController.logout);

module.exports = router;
