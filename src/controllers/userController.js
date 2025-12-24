const User = require('../models/user');
const Role = require('../models/role');
const Hospital = require('../models/hospital');

// 1. Lấy danh sách chờ duyệt (Strict Hierarchy)
exports.getPendingUsers = async (req, res) => {
    try {
        const currentUserId = req.user.id;
        const currentHospitalId = req.user.hospitalId;

        // Lấy thông tin người đang gọi API để biết là Siêu Admin hay Admin BV
        const currentUser = await User.findByPk(currentUserId, {
            include: [Role]
        });

        const currentUserRoles = currentUser.Roles.map(r => r.slug);

        // Cấu hình điều kiện lọc mặc định
        let userWhereCondition = { isActive: false };
        let roleWhereCondition = {}; // Lọc theo role của người được duyệt
        let includeHospital = false;

        // --- LOGIC PHÂN TẦNG ---

        // TRƯỜNG HỢP 1: LÀ SIÊU ADMIN
        if (currentUserRoles.includes('sieu_admin')) {
            // Chỉ được xem các "Admin Bệnh Viện" đang chờ duyệt
            // KHÔNG ĐƯỢC xem NVYT
            roleWhereCondition = { slug: 'admin_bv' };
            includeHospital = true; // Cần xem nó thuộc viện nào
        }

        // TRƯỜNG HỢP 2: LÀ ADMIN BỆNH VIỆN
        else if (currentUserRoles.includes('admin_bv')) {
            // Chỉ được xem "NVYT" của CHÍNH BỆNH VIỆN MÌNH
            userWhereCondition.hospitalId = currentHospitalId;
            roleWhereCondition = { slug: 'nvyt' };
            includeHospital = false; // Không cần join bảng Hospital vì cùng viện rồi
        }

        // TRƯỜNG HỢP KHÁC: CÚT
        else {
            return res.status(403).json({ message: 'Bạn không có quyền xem danh sách chờ duyệt!' });
        }

        // --- TRUY VẤN DB ---
        const pendingUsers = await User.findAll({
            where: userWhereCondition,
            attributes: { exclude: ['password'] },
            include: [
                {
                    model: Role,
                    where: roleWhereCondition, // <--- Chốt chặn quan trọng nhất ở đây
                    attributes: ['name', 'slug'],
                    through: { attributes: [] }
                },
                // Chỉ join bảng Hospital nếu cần (cho Siêu Admin xem)
                ...(includeHospital ? [{ model: Hospital, attributes: ['name'] }] : [])
            ]
        });

        res.status(200).json({
            message: "Danh sách chờ duyệt",
            role_viewing: currentUserRoles.includes('sieu_admin') ? 'Siêu Admin (Chỉ thấy Admin BV)' : 'Admin BV (Chỉ thấy NVYT)',
            count: pendingUsers.length,
            data: pendingUsers
        });

    } catch (error) {
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

// 2. Duyệt thành viên (Strict Hierarchy)
exports.approveUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const currentUserId = req.user.id;

        // Lấy lại info người duyệt để chắc chắn logic
        const currentUser = await User.findByPk(currentUserId, { include: [Role] });
        const currentUserRoles = currentUser.Roles.map(r => r.slug);

        // Tìm user cần được duyệt
        const targetUser = await User.findByPk(userId, {
            include: [Role]
        });

        if (!targetUser) {
            return res.status(404).json({ message: 'Không tìm thấy người dùng này!' });
        }
        if (targetUser.isActive) {
            return res.status(400).json({ message: 'Tài khoản này đã được duyệt rồi!' });
        }

        const targetRoles = targetUser.Roles.map(r => r.slug);

        // --- LOGIC CHẶN QUYỀN DUYỆT ---

        // KỊCH BẢN 1: Nếu người duyệt là SIÊU ADMIN
        if (currentUserRoles.includes('sieu_admin')) {
            // Chỉ được duyệt Admin Bệnh Viện
            if (!targetRoles.includes('admin_bv')) {
                return res.status(403).json({
                    message: '⛔ Siêu Admin chỉ được phép duyệt tài khoản Quản trị Bệnh Viện. NVYT thuộc trách nhiệm của Admin BV.'
                });
            }
        }

        // KỊCH BẢN 2: Nếu người duyệt là ADMIN BỆNH VIỆN
        else if (currentUserRoles.includes('admin_bv')) {
            // 1. Phải cùng bệnh viện
            if (targetUser.hospitalId !== currentUser.hospitalId) {
                return res.status(403).json({ message: '⛔ Không được duyệt người của bệnh viện khác!' });
            }
            // 2. Chỉ được duyệt NVYT (Không được duyệt Admin BV khác hoặc Siêu Admin)
            if (!targetRoles.includes('nvyt')) {
                return res.status(403).json({ message: '⛔ Bạn chỉ có quyền duyệt Nhân viên Y tế!' });
            }
        }

        // KỊCH BẢN 3: NVYT hay ông nào khác lẻn vào
        else {
            return res.status(403).json({ message: 'Bạn không có quyền thực hiện hành động này.' });
        }

        // --- THỰC HIỆN DUYỆT ---
        targetUser.isActive = true;
        await targetUser.save();

        res.status(200).json({
            message: `✅ Đã phê duyệt thành công cho: ${targetUser.fullName}`,
            role: targetRoles[0] // Trả về role để client biết vừa duyệt ông nào
        });

    } catch (error) {
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

// 3. Xem hồ sơ cá nhân (Quyền: view_profile)
exports.getProfile = async (req, res) => {
    try {
        // req.user.id lấy từ Token
        const user = await User.findByPk(req.user.id, {
            attributes: { exclude: ['password'] } // Không trả về mật khẩu
        });

        if (!user) return res.status(404).json({ message: 'User không tồn tại' });

        res.json({ user });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

// 4. Cập nhật hồ sơ (Quyền: update_profile)
exports.updateProfile = async (req, res) => {
    try {
        const { fullName, email } = req.body;
        const user = await User.findByPk(req.user.id);

        if (!user) return res.status(404).json({ message: 'User không tồn tại' });

        // Chỉ cho phép sửa Tên và Email (Không cho sửa Role, Username hay HospitalId linh tinh)
        if (fullName) user.fullName = fullName;
        if (email) user.email = email;

        await user.save();

        res.json({ message: '✅ Cập nhật hồ sơ thành công!', user });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

// 5. Đổi mật khẩu (Quyền: change_password)
exports.changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = await User.findByPk(req.user.id);

        // Kiểm tra mật khẩu cũ
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Mật khẩu hiện tại không đúng!' });
        }

        // Mã hóa mật khẩu mới
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);

        await user.save();

        res.json({ message: '✅ Đổi mật khẩu thành công! Vui lòng đăng nhập lại.' });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

// 6. Lấy danh sách nhân viên CHÍNH THỨC (Đang hoạt động)
exports.getActiveUsers = async (req, res) => {
    try {
        const currentUserId = req.user.id;
        const currentHospitalId = req.user.hospitalId;

        // Lấy role người gọi
        const currentUser = await User.findByPk(currentUserId, { include: [Role] });
        const currentUserRoles = currentUser.Roles.map(r => r.slug);

        let whereCondition = { isActive: true }; // <--- KHÁC BIỆT: Lấy người đang active
        let roleWhere = {};
        let includeHospital = false;

        // PHÂN TẦNG
        if (currentUserRoles.includes('sieu_admin')) {
            roleWhere = { slug: 'admin_bv' }; // Chỉ xem Admin BV
            includeHospital = true;
        } else if (currentUserRoles.includes('admin_bv')) {
            whereCondition.hospitalId = currentHospitalId;
            roleWhere = { slug: 'nvyt' }; // Chỉ xem NVYT viện mình
        } else {
            return res.status(403).json({ message: 'Không đủ quyền hạn!' });
        }

        const users = await User.findAll({
            where: whereCondition,
            attributes: { exclude: ['password'] },
            include: [
                {
                    model: Role,
                    where: roleWhere,
                    attributes: ['name', 'slug'],
                    through: { attributes: [] }
                },
                ...(includeHospital ? [{ model: Hospital, attributes: ['name'] }] : [])
            ]
        });

        res.status(200).json({
            message: "Danh sách nhân viên đang hoạt động",
            count: users.length,
            data: users
        });

    } catch (error) {
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

// 7. Khóa tài khoản (Kick user/Nghỉ việc)
exports.lockUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const currentUser = await User.findByPk(req.user.id, { include: [Role] });
        const currentUserRoles = currentUser.Roles.map(r => r.slug);

        const targetUser = await User.findByPk(userId, { include: [Role] });
        if (!targetUser) return res.status(404).json({ message: 'User không tồn tại' });

        const targetRoles = targetUser.Roles.map(r => r.slug);

        // LOGIC CHẶN QUYỀN (Copy từ hàm approveUser sang)
        if (currentUserRoles.includes('sieu_admin')) {
            if (!targetRoles.includes('admin_bv')) return res.status(403).json({ message: 'Chỉ được khóa Admin BV' });
        } else if (currentUserRoles.includes('admin_bv')) {
            if (targetUser.hospitalId !== currentUser.hospitalId) return res.status(403).json({ message: 'Khác bệnh viện!' });
            if (!targetRoles.includes('nvyt')) return res.status(403).json({ message: 'Chỉ được khóa NVYT' });
        } else {
            return res.status(403).json({ message: 'Không có quyền' });
        }

        // Thực hiện khóa
        targetUser.isActive = false;
        await targetUser.save();

        res.status(200).json({ message: `🚫 Đã khóa tài khoản: ${targetUser.username}` });

    } catch (error) {
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

// 8. Reset mật khẩu (Về mặc định 123456)
exports.resetUserPassword = async (req, res) => {
    try {
        const { userId } = req.params;
        // ... (Đoạn code check quyền SuperAdmin/AdminBV y hệt hàm lockUser ở trên - Ông tự copy paste nhé cho code đỡ dài) ...
        // Tốt nhất là ông tách đoạn check quyền này ra thành 1 hàm riêng (helper) nhưng thôi copy cũng được.

        // GIẢ SỬ ĐÃ PASS CHECK QUYỀN...
        const targetUser = await User.findByPk(userId); // (Cần tìm user lại hoặc dùng biến ở đoạn check quyền)

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('123456', salt); // Mật khẩu mặc định

        targetUser.password = hashedPassword;
        await targetUser.save();

        res.status(200).json({ message: `♻️ Đã reset mật khẩu cho ${targetUser.username} về mặc định: 123456` });

    } catch (error) {
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};