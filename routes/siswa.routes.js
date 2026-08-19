const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth.middleware');
const siswaController = require('../controllers/siswa.controller');

// DATA SISWA
router.get('/', auth, siswaController.index);

// EXPORT EXCEL
router.get('/export/excel', auth, siswaController.exportExcel);

// Detail siswa (tombol "Detail")
router.get('/detail/:id', auth, siswaController.detail);

// EDIT DATA SISWA
router.get('/edit/:id', auth, siswaController.editForm);
router.post('/edit/:id', auth, siswaController.editStore);

// Hapus siswa
router.get('/delete/:id', auth, siswaController.delete);

// ASSIGN KELAS BIMBEL
router.get('/assign-kelas/:id', auth, siswaController.assignForm);
router.post('/assign-kelas/:id', auth, siswaController.assignStore);

// STATUS SISWA
router.post('/konfirmasi/:id', auth, siswaController.konfirmasi);
router.get('/nonaktifkan/:id', auth, siswaController.nonaktifkan);

// HARGA BULANAN SISWA
router.get('/harga/:id', auth, siswaController.hargaForm);
router.post('/harga/:id', auth, siswaController.hargaStore);

module.exports = router;
