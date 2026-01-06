const User = require('../models/user');
const bcrypt = require('bcryptjs');

// 1. Xem hồ sơ cá nhân (Quyền: view_profile)
exports.getProfile = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, {
            attributes: { exclude: ['password', 'password_hash'] },
            include: [{ model: Role, as: 'Roles' }]
        });

        if (!user) return res.status(404).json({ message: 'User không tồn tại' });
        res.json({ user });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

// 2. Cập nhật hồ sơ (Quyền: update_profile)
exports.updateProfile = async (req, res) => {
    try {
        const { fullName, email } = req.body;
        console.log("Dữ liệu nhận được:", req.body);
        const user = await User.findByPk(req.user.id);
        if (!user) return res.status(404).json({ message: 'User không tồn tại' });
        if (fullName !== undefined) user.fullName = fullName;
        if (email !== undefined) user.email = email;
        await user.save();
        res.json({ message: '✅ Cập nhật thông tin thành công!', user });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

// 3. Đổi mật khẩu (Quyền: change_password)
exports.changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) { return res.status(400).json({ message: 'Vui lòng nhập cả mật khẩu cũ và mới!' }); }
        const user = await User.findByPk(req.user.id);
        if (!user) return res.status(404).json({ message: 'User không tồn tại' });
        const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isMatch) { return res.status(400).json({ message: 'Mật khẩu hiện tại không đúng!' }); }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        user.password_hash = hashedPassword;
        await user.save();
        res.json({ message: '✅ Đổi mật khẩu thành công! Hãy đăng nhập lại.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

// 4. Reset mật khẩu (Dành cho Admin reset giùm nhân viên quên pass)
exports.resetUserPassword = async (req, res) => {
    try {
        const { userId } = req.params;

        // (Chỗ này ông nhớ thêm middleware checkPermission('manage_user') ở Router nhé)
        const targetUser = await User.findByPk(userId);
        if (!targetUser) return res.status(404).json({ message: 'Không tìm thấy nhân viên này' });

        targetUser.password_hash = '123456';
        await targetUser.save();

        res.status(200).json({ message: `♻️ Đã reset mật khẩu nhân viên về: 123456` });

    } catch (error) {
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};
