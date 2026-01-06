const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyToken, checkPermission } = require('../middlewares/authMiddleware');

router.get('/profile', verifyToken, checkPermission('manage_account'), userController.getProfile);
router.put('/update-profile', verifyToken, checkPermission('manage_account'), userController.updateProfile);
router.put('/change-password', verifyToken, checkPermission('manage_account'), userController.changePassword);
router.put('/reset-password/:userId', verifyToken, checkPermission('manage_account'), userController.resetUserPassword);

module.exports = router;