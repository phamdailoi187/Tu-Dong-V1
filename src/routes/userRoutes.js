const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyToken, checkPermission } = require('../middlewares/authMiddleware');

router.get('/profile', verifyToken, userController.getProfile);
router.put('/update-profile', verifyToken, userController.updateProfile);
router.put('/change-password', verifyToken, userController.changePassword);
router.put('/reset-password/:userId', verifyToken, userController.resetUserPassword);

module.exports = router;