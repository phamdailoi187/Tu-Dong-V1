const jwt = require('jsonwebtoken');

// 1. Bảo vệ: Kiểm tra Token (Đã đăng nhập chưa?)
const verifyToken = (req, res, next) => {
    // Client sẽ gửi token ở header dạng: "Authorization: Bearer <token_o_day>"
    const authHeader = req.header('Authorization');

    // Tách chữ "Bearer" ra để lấy đúng chuỗi token
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Cấm vào! Bạn chưa đăng nhập.' });
    }

    try {
        // Giải mã token bằng chìa khóa bí mật (phải khớp với bên authController)
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'bi_mat');

        // Quan trọng: Gán thông tin user (id, role) vào biến req để dùng ở bước sau
        req.user = decoded;

        next(); // Hợp lệ -> Cho đi tiếp
    } catch (error) {
        return res.status(403).json({ message: 'Token đểu hoặc đã hết hạn!' });
    }
};
// 2. Bảo vệ: Kiểm tra Quyền (Có được phép làm việc này không?)
// Hàm này nhận vào danh sách các role được phép. VD: ['admin', 'gsv']
const checkRole = (allowedRoles) => {
    return (req, res, next) => {
        // req.user có được nhờ hàm verifyToken chạy trước đó
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                message: `Bạn là '${req.user.role}', không đủ quyền truy cập vào đây!`
            });
        }
        next(); // Đúng quyền -> Cho đi tiếp
    };
};

module.exports = { verifyToken, checkRole };