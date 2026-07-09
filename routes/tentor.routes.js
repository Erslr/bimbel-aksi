const express = require('express');
const router = express.Router();
const tentorController = require('../controllers/tentor.controller');
const auth = require('../middleware/auth.middleware');

router.get('/', auth, tentorController.index);
router.get('/add', auth, tentorController.add);
router.post('/add', auth, tentorController.store);
router.get('/edit/:id', auth, tentorController.edit);
router.post('/edit/:id', auth, tentorController.update);
router.get('/delete/:id', auth, tentorController.delete);

module.exports = router;
