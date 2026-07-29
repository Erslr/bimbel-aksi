const express = require('express');
const router = express.Router();

const auth = require('../middleware/auth.middleware');

const notifController = require('../controllers/notifikasi.controller');

router.get('/notifikasi', auth, notifController.getNotif);

router.post('/notifikasi/read', auth, notifController.readNotif);

module.exports = router;