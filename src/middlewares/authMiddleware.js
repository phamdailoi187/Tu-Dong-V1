const jwt = require('jsonwebtoken');
const User = require('../models/user');
const Role = require('../models/role');
const Permission = require('../models/permission');

exports.verifyToken = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) { return res.status(401).json({ message: 'Vui lòng đăng nhập (Thiếu Token)!' }); }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findByPk(decoded.id, {
            include: [{
                model: Role,
                include: [Permission]
            }]
        });

        // 3. Kiểm tra user còn tồn tại hoặc còn active không
        if (!user || !user.isActive) {
            return res.status(401).json({ message: 'Tài khoản không tồn tại hoặc đã bị khóa!' });
        }

        // 4. Gán User vào request để các hàm sau dùng luôn
        req.user = user;

        next();
    } catch (err) {
        console.error("Lỗi Auth:", err.message);
        res.status(401).json({ message: 'Token không hợp lệ hoặc đã hết hạn!' });
    }
};

exports.checkPermission = (requiredPermissionSlug) => {
    return (req, res, next) => {
        try {
            const user = req.user;

            if (!user) return res.status(403).json({ message: 'Chưa xác thực!' });
            let userPermissions = [];
            if (user.Roles) {
                user.Roles.forEach(role => {
                    if (role.Permissions) {
                        role.Permissions.forEach(permission => {
                            userPermissions.push(permission.slug);
                        });
                    }
                });
            }
            const MASTER_PERMISSIONS = ['manage_system', 'manage_hospital', 'manage_account'];
            const hasMasterPermission = MASTER_PERMISSIONS.some(masterSlug => userPermissions.includes(masterSlug));
            if (hasMasterPermission) { return next(); }
            if (userPermissions.includes(requiredPermissionSlug)) { return next(); }
            return res.status(403).json({
                message: '⛔ Bạn không có quyền thực hiện hành động này!',
                missing_permission: requiredPermissionSlug
            });

        } catch (error) {
            console.error("Lỗi check quyền:", error);
            res.status(500).json({ message: 'Lỗi server khi kiểm tra quyền' });
        }
    };
};

exports.checkRole = (allowedRoleSlugs) => {
    return (req, res, next) => {
        const user = req.user;
        const userRoles = user.Roles.map(r => r.slug);

        const hasRole = userRoles.some(slug => allowedRoleSlugs.includes(slug));

        if (hasRole) {
            next();
        } else {
            res.status(403).json({ message: '⛔ Sai vai trò (Role)!' });
        }
    };
};