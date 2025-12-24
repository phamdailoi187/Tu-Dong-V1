const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Định nghĩa các biển chỉ đường
router.post('/register', authController.register); // sường này để Đăng ký
router.post('/login', authController.login);       // Đường này để Đăng nhập

module.exports = router;