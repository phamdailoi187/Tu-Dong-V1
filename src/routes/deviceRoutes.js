const express = require('express');
const router = express.Router();
const deviceController = require('../controllers/deviceController');
const { verifyToken, checkPermission } = require('../middlewares/authMiddleware');

// Admin thêm thiết bị
router.post('/add', verifyToken, deviceController.addDevice);

// Xem danh sách thiết bị
router.get('/list', verifyToken, deviceController.getDevicesByHospital);

// API mở cho ESP32 gọi (Thường không cần Token user, mà dùng API Key riêng - tính sau)
router.post('/data-hook', deviceController.receiveData);

module.exports = router;