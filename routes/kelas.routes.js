const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth.middleware');
const kelasController = require('../controllers/kelas.controller');

// Tampilkan semua kelas
router.get('/', auth, kelasController.index);

// Form tambah kelas
router.get('/add', auth, kelasController.formAdd);

// Proses tambah kelas
router.post('/add', auth, kelasController.store);

// Form edit kelas
router.get('/edit/:id', auth, kelasController.formEdit);

// Proses update kelas
router.post('/edit/:id', auth, kelasController.update);

// Hapus kelas
router.get('/delete/:id', auth, kelasController.delete);

module.exports = router;
