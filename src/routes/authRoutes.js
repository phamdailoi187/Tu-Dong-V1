const express = require('express');
const router = express.Router();
const authController = require('../controllers/authControllers'); // Nhớ check kỹ tên file có chữ 's' hay không nhé

// Định nghĩa các biển chỉ đường
router.post('/register', authController.register); // Đường này để Đăng ký
router.post('/login', authController.login);       // Đường này để Đăng nhập

module.exports = router;