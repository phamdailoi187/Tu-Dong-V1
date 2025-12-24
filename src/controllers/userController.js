const User = require('../models/user');

// 1. Lấy danh sách nhân viên đang chờ duyệt (isActive: false)
exports.getPendingUsers = async (req, res) => {
    try {
        const { role, hospitalId } = req.user; // Lấy thông tin người đang duyệt
        let whereCondition = { isActive: false };

        // LOGIC PHÂN QUYỀN:
        // - Nếu là Admin: Xem được hết (cả GSV và NVYT đang chờ)
        // - Nếu là GSV: Chỉ xem được NVYT đang chờ
        if (role === 'gsv') {
            whereCondition.role = 'nvyt';
        }
        if (role === 'super_admin') {
        } else if (role === 'admin_benh_vien') {
            whereCondition.hospitalId = hospitalId;
            whereCondition.role = 'nvyt';
        } else {
            return res.status(403).json({ message: 'Không đủ quyền hạn!' });
        }

        // Lấy danh sách, trừ password ra cho bảo mật
        const users = await User.findAll({
            where: whereCondition,
            include: [{ model: Hospital, attributes: ['name'] }],
            attributes: { exclude: ['password'] }
        });

        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

// 2. Duyệt thành viên (Sửa isActive thành true)
exports.approveUser = async (req, res) => {
    try {
        const userId = req.params.id; // Lấy ID người cần duyệt từ URL
        const currentUserRole = req.user.role;

        // Tìm user cần duyệt
        const userToApprove = await User.findByPk(userId);
        if (!userToApprove) {
            return res.status(404).json({ message: 'Không tìm thấy người dùng này!' });
        }

        // LOGIC CHẶN QUYỀN: GSV không được phép duyệt cho GSV khác hoặc Admin
        if (currentUserRole === 'gsv' && userToApprove.role !== 'nvyt') {
            return res.status(403).json({ message: 'Bạn chỉ được quyền duyệt cho Nhân viên y tế!' });
        }

        // Cập nhật trạng thái
        userToApprove.isActive = true;
        await userToApprove.save();

        res.status(200).json({ message: `Đã duyệt thành công cho ${userToApprove.fullName}` });

    } catch (error) {
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};