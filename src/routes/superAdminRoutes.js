const express = require('express');
const router = express.Router();
const superAdminController = require('../controllers/superAdminController');
const { verifyToken, checkPermission } = require('../middlewares/authMiddleware');

router.get('/hospitals', verifyToken, checkPermission('manage_system'), superAdminController.getAllHospitals);
router.post('/create-hospital', verifyToken, checkPermission('manage_system'), superAdminController.createHospitalAndAdmin);
router.delete('/hospitals/:id', verifyToken, checkPermission('manage_system'), superAdminController.deleteHospital);
router.put('/hospital-status/:hospitalId', verifyToken, checkPermission('manage_system'), superAdminController.toggleHospitalStatus);
module.exports = router;