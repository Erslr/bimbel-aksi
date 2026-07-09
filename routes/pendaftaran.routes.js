// routes/pendaftaran.routes.js
const express = require('express');
const router = express.Router();
const pendaftaranController = require('../controllers/pendaftaran.controller');

router.get('/', pendaftaranController.form);
router.post('/', pendaftaranController.store);

module.exports = router;