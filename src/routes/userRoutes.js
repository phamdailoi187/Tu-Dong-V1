const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyToken, checkRole } = require('../middlewares/authMiddleware'); // Nhớ file này phải đúng tên nhé

// QUY TẮC:
// 1. Phải đăng nhập (verifyToken) mới được vào đây.
// 2. Chỉ Admin và GSV mới được vào (NVYT không có quyền duyệt ai cả).

// API: Lấy danh sách chờ
router.get('/pending',
    verifyToken,
    checkRole(['admin', 'gsv']),
    userController.getPendingUsers
);

// API: Duyệt user theo ID
router.put('/approve/:id',
    verifyToken,
    checkRole(['admin', 'gsv']),
    userController.approveUser
);

module.exports = router;