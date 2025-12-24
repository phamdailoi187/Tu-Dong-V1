const express = require('express');
const router = express.Router();
const adminController = require('../controllers/superAdminController');
const { verifyToken, checkPermission } = require('../middlewares/authMiddleware');

// Chỉ super_admin mới được vào
router.post('/create-hospital',
    verifyToken,
    checkPermission('manage_hospital'),
    adminController.createHospitalAndAdmin
);
router.get('/staffs',
    verifyToken,
    checkPermission('view_staff_list'), // <--- Chốt chặn ở đây
    (req, res) => {
        // Controller giả (sau này viết thật sau)
        res.json({ message: "Đây là danh sách nhân viên của bạn..." });
    }
);
router.get('/hospitals', verifyToken, checkPermission('manage_hospital'), adminController.getAllHospitals);
router.put('/hospital-status/:hospitalId', verifyToken, checkPermission('manage_hospital'), adminController.toggleHospitalStatus);
module.exports = router;