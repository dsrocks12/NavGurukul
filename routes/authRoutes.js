// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.get('/Login', authController.getLogin);
router.post('/Login', authController.postLogin);
router.get('/Register', authController.getRegister);
router.post('/Register', authController.postRegister);
router.get('/Logout', authController.logout);

module.exports = router;
