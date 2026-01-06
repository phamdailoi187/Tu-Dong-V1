const express = require('express');
const router = express.Router();
const bvAdminController = require('../controllers/bvAdminController');
const { verifyToken, checkPermission } = require('../middlewares/authMiddleware');

router.get('/pending-users', verifyToken, checkPermission('manage_hospital'), bvAdminController.getPendingUsers);
router.put('/approve/:userId', verifyToken, checkPermission('manage_hospital'), bvAdminController.approveUser);
router.post('/create-nvyt', verifyToken, checkPermission('manage_hospital'), bvAdminController.createNVYT);
router.get('/list-nvyt', verifyToken, checkPermission('manage_hospital'), bvAdminController.getActiveUsers);
router.get('/staff/:id', verifyToken, checkPermission('manage_hospital'), bvAdminController.getStaffDetail);
router.put('/staff/:id/role', verifyToken, checkPermission('manage_hospital'), bvAdminController.updateStaffRole);
router.put('/lock/:userId', verifyToken, checkPermission('manage_hospital'), bvAdminController.lockUser);
router.delete('/staff/:id', verifyToken, checkPermission('manage_hospital'), bvAdminController.deleteStaff);
router.get('/permissions-list', verifyToken, checkPermission('manage_hospital'), bvAdminController.getAllPermissions);
router.post('/create-role', verifyToken, checkPermission('manage_hospital'), bvAdminController.createRole);
router.get('/my-roles', verifyToken, checkPermission('manage_hospital'), bvAdminController.getRoles);
router.delete('/delete-role/:id', verifyToken, checkPermission('manage_hospital'), bvAdminController.deleteRole);
module.exports = router;