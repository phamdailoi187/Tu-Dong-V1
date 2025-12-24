const jwt = require('jsonwebtoken');
const User = require('../models/user');
const Role = require('../models/role');
const Permission = require('../models/permission');
// 1. Xác thực Token
exports.verifyToken = (req, res, next) => {
    const token = req.header('Authorization')?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Chưa đăng nhập (Thiếu Token)!' });

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET || 'secret_key');
        req.user = verified; // { id, roles: ['...'], hospitalId }
        next();
    } catch (err) {
        res.status(400).json({ message: 'Token không hợp lệ hoặc đã hết hạn!' });
    }
};

// 2. Check Quyền (Logic mới: So sánh mảng)
exports.checkRole = (allowedRoles) => { // allowedRoles ví dụ: ['sieu_admin', 'admin_bv']
    return (req, res, next) => {
        const userRoles = req.user.roles || [];

        // Kiểm tra xem user có ít nhất 1 role cho phép không
        const hasPermission = userRoles.some(role => allowedRoles.includes(role));

        if (!hasPermission) {
            return res.status(403).json({ message: '⛔ Bạn không có quyền thực hiện hành động này!' });
        }
        next();
    };
};

//3. Check Permission (Dựa trên DB)
exports.checkPermission = (requiredPermission) => {
    return async (req, res, next) => {
        try {
            // req.user.id có được từ hàm verifyToken ở trên
            const userId = req.user.id;

            // 1. Tìm User và nạp tất cả Role + Permission của họ lên
            const user = await User.findByPk(userId, {
                include: [{
                    model: Role,
                    include: [Permission] // Lấy luôn Permission bên trong Role
                }]
            });

            if (!user) return res.status(403).json({ message: 'User không tồn tại!' });

            // 2. Gom tất cả quyền của user vào 1 mảng duy nhất
            // Ví dụ user có 2 role, mỗi role có 3 quyền -> gộp lại thành mảng to
            let allPermissions = [];
            user.Roles.forEach(role => {
                role.Permissions.forEach(perm => {
                    allPermissions.push(perm.slug);
                });
            });

            // 3. Kiểm tra xem có quyền yêu cầu không
            if (allPermissions.includes(requiredPermission)) {
                next(); // Có quyền -> Cho qua
            } else {
                res.status(403).json({
                    message: '⛔ Bạn không có quyền thực hiện hành động này (Thiếu permission)!',
                    missing: requiredPermission // Báo luôn là thiếu cái gì cho dễ debug
                });
            }

        } catch (error) {
            res.status(500).json({ message: 'Lỗi kiểm tra quyền', error: error.message });
        }
    };
};