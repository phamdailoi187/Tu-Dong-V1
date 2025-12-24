const express = require('express');
const router = express.Router();
const bvAdminController = require('../controllers/bvAdminController'); // Import đúng file mới
const { verifyToken, checkPermission } = require('../middlewares/authMiddleware');

// Tất cả các API dưới đây đều yêu cầu quyền 'manage_staff'
// (Quyền này chỉ Admin BV mới có trong bảng Permission)

// 1. Tạo NVYT
router.post('/create-nvyt',
    verifyToken,
    checkPermission('manage_staff'),
    bvAdminController.createNVYT
);

// 2. Xem danh sách NVYT
router.get('/list-nvyt',
    verifyToken,
    checkPermission('view_staff_list'),
    bvAdminController.getAllNVYT
);

// 3. Xóa NVYT
router.delete('/delete-nvyt/:userId',
    verifyToken,
    checkPermission('manage_staff'),
    bvAdminController.deleteNVYT
);

module.exports = router;