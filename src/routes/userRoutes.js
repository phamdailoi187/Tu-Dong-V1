const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyToken, checkPermission } = require('../middlewares/authMiddleware');

// 1. Xem danh sách chờ (Cần quyền approve_staff)
router.get('/pending-users',
    verifyToken,
    checkPermission('approve_staff'),
    userController.getPendingUsers
);

// 2. Duyệt user (Cần quyền approve_staff)
router.put('/approve/:userId',
    verifyToken,
    checkPermission('approve_staff'),
    userController.approveUser
);
// 3. Xem Profile
router.get('/profile',
    verifyToken,
    checkPermission('view_profile'), // <--- Phải có quyền này
    userController.getProfile
);

// 4. Cập nhật Profile
router.put('/update-profile',
    verifyToken,
    checkPermission('update_profile'),
    userController.updateProfile
);

// 5. Đổi mật khẩu
router.put('/change-password',
    verifyToken,
    checkPermission('change_password'),
    userController.changePassword
);

// 6. Xem danh sách nhân viên CHÍNH THỨC
router.get('/active-users',
    verifyToken,
    checkPermission('view_staff_list'), // <--- Permission đã có trong Seeder
    userController.getActiveUsers
);

// 7. Khóa tài khoản
router.put('/lock/:userId',
    verifyToken,
    checkPermission('manage_staff'), // <--- Permission đã có trong Seeder
    userController.lockUser
);

// 8. Reset mật khẩu
router.put('/reset-password/:userId',
    verifyToken,
    checkPermission('manage_staff'),
    userController.resetUserPassword
);
module.exports = router;
