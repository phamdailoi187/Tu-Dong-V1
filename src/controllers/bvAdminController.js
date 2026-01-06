const User = require('../models/user');
const Role = require('../models/role');
const Permission = require('../models/permission');
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
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
// 3. Tạo NVYT Mới
exports.createNVYT = async (req, res) => {
    try {
        const { fullName, email, username, password, roleId } = req.body;
        const hospitalId = req.user.hospitalId;
        const existUser = await User.findOne({ where: { username } });
        if (existUser) return res.status(400).json({ message: 'Tên đăng nhập đã tồn tại' });
        const existEmail = await User.findOne({ where: { email } });
        if (existEmail) return res.status(400).json({ message: 'Email này đã được sử dụng' });
        const hashPassword = await bcrypt.hash(password, 10);
        const newUser = await User.create({
            fullName,
            email,
            username,
            password_hash: hashPassword,
            hospitalId: hospitalId,
            isActive: true
        });
        if (roleId) {
            const role = await Role.findByPk(roleId);
            if (role) await newUser.addRole(role);
        }
        res.status(201).json({ message: 'Tạo nhân viên thành công', data: newUser });
    } catch (error) {
        console.error("Lỗi tạo NVYT:", error);
        res.status(500).json({ message: 'Lỗi server: ' + error.message });
    }
};
// 4. Lấy danh sách nhân viên CHÍNH THỨC
exports.getActiveUsers = async (req, res) => {
    try {
        const currentUserId = req.user.id;
        const currentHospitalId = req.user.hospitalId;
        const currentUser = await User.findByPk(currentUserId, { include: [Role] });
        const currentUserRoles = currentUser.Roles.map(r => r.slug);
        let whereCondition = {};
        let includeOptions = [];
        if (currentUserRoles.includes('sieu_admin')) {
            includeOptions = [{
                model: Role,
                as: 'Roles',
                where: { slug: 'admin_bv' },
                attributes: ['name', 'slug'],
                through: { attributes: [] }
            }, {
                model: Hospital,
                attributes: ['name']
            }];
        }
        else if (currentUserRoles.includes('admin_bv') || currentUserRoles.includes('manage_hospital')) {
            whereCondition = {
                hospitalId: currentHospitalId,
                id: { [Op.ne]: currentUserId }
            };
            includeOptions = [{
                model: Role,
                as: 'Roles',
                required: false,
                attributes: ['name', 'slug'],
                through: { attributes: [] }
            }];
        } else { return res.status(403).json({ message: 'Không đủ quyền hạn!' }); }
        let users = await User.findAll({
            where: whereCondition,
            attributes: { exclude: ['password', 'password_hash'] },
            include: includeOptions,
            order: [['created_at', 'DESC']]
        });
        if (currentUserRoles.includes('admin_bv')) {
            users = users.filter(u => {
                if (!u.Roles || u.Roles.length === 0) return true;
                const isRestricted = u.Roles.some(r => ['sieu_admin', 'admin_bv'].includes(r.slug));
                return !isRestricted;
            });
        }
        res.status(200).json({ message: "Danh sách nhân viên", count: users.length, data: users });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};
// 5. Lấy chi tiết một nhân viên (Chỉ trong viện mình)
exports.getStaffDetail = async (req, res) => {
    try {
        const { id } = req.params;
        const currentAdmin = req.user;
        const staff = await User.findOne({
            where: {
                id: id,
                hospitalId: currentAdmin.hospitalId
            },
            attributes: { exclude: ['password', 'password_hash'] },
            include: [{
                model: Role,
                as: 'Roles',
                attributes: ['id', 'name', 'slug'],
                through: { attributes: [] }
            }]
        });
        if (!staff) { return res.status(404).json({ message: 'Không tìm thấy nhân viên này trong bệnh viện của bạn!' }); }
        res.json({ message: 'Lấy thông tin thành công', data: staff });
    } catch (error) {
        console.error("Lỗi lấy chi tiết nhân viên:", error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};
// 6. Cập nhật Role (Chức vụ) cho nhân viên
exports.updateStaffRole = async (req, res) => {
    try {
        const { id } = req.params;
        const { roleId } = req.body;
        const currentAdmin = req.user;
        const staff = await User.findOne({ where: { id: id, hospitalId: currentAdmin.hospitalId } });
        if (!staff) { return res.status(404).json({ message: 'Không tìm thấy nhân viên!' }); }
        if (staff.id === currentAdmin.id) { return res.status(400).json({ message: 'Bạn không thể tự thay đổi chức vụ của chính mình tại đây!' }); }
        if (!roleId || roleId === "") {
            await staff.setRoles([]);
            return res.json({ message: '✅ Đã gỡ chức vụ thành công (Chưa gán)!' });
        }
        const newRole = await Role.findByPk(roleId);
        if (!newRole) { return res.status(400).json({ message: 'Chức vụ mới không hợp lệ!' }); }
        await staff.setRoles([newRole]);
        res.json({ message: `✅ Đã cập nhật chức vụ thành: ${newRole.name}` });
    } catch (error) {
        console.error("Lỗi cập nhật role:", error);
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
        else if (currentUserRoles.includes('admin_bv') || currentUserRoles.includes('manage_hospital')) {
            if (targetUser.hospitalId !== currentUser.hospitalId) { return res.status(403).json({ message: 'Người này không thuộc bệnh viện của bạn!' }); }
            if (targetUser.id === currentUser.id) {
                return res.status(400).json({ message: 'Không thể tự khóa tài khoản của mình!' });
            }
        } else { return res.status(403).json({ message: 'Bạn không có quyền thực hiện hành động này' }); }
        targetUser.isActive = !targetUser.isActive;
        await targetUser.save();
        const statusMsg = targetUser.isActive ? '✅ Đã MỞ KHÓA' : '🚫 Đã KHÓA';
        res.status(200).json({ message: `${statusMsg} tài khoản: ${targetUser.username}` });
    } catch (error) {
        console.error("Lỗi khóa user:", error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};
// 8. Xóa một nhân viên (Chỉ xóa người trong viện mình)
exports.deleteStaff = async (req, res) => {
    try {
        const { id } = req.params;
        const currentAdmin = req.user;
        const staff = await User.findOne({
            where: { id: id, hospitalId: currentAdmin.hospitalId }
        });

        if (!staff) { return res.status(404).json({ message: 'Không tìm thấy nhân viên này trong bệnh viện của bạn!' }); }
        if (staff.id === currentAdmin.id) { return res.status(400).json({ message: 'Bạn không thể tự xóa tài khoản của chính mình!' }); }
        await staff.destroy();
        res.json({ message: '✅ Đã xóa nhân viên thành công!' });
    } catch (error) {
        console.error("Lỗi xóa nhân viên:", error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};
// 9. Lấy tất cả quyền
exports.getAllPermissions = async (req, res) => {
    try {
        const permissions = await Permission.findAll({
            where: {
                slug: {
                    // 👇 Loại bỏ các slug quyền "Vua" ra khỏi danh sách
                    [Op.notIn]: ['manage_account', 'manage_system', 'manage_hospital']
                }
            }
        });
        res.json({ data: permissions });
    } catch (error) {
        console.error("Lỗi lấy permissions:", error);
        res.status(500).json({ message: 'Lỗi server' });
    }
};
// 10. Tạo Role mới
exports.createRole = async (req, res) => {
    try {
        const { name, description, permissionIds } = req.body;
        const hospitalId = req.user.hospitalId;

        if (!hospitalId) return res.status(400).json({ message: 'Bạn không thuộc bệnh viện nào!' });

        const slug = `bv_${hospitalId}_${name.toLowerCase().replace(/ /g, '_').normalize("NFD").replace(/[\u0300-\u036f]/g, "")}`;

        const newRole = await Role.create({
            name,
            slug,
            description,
            hospitalId
        });

        if (permissionIds && permissionIds.length > 0) {
            const permissions = await Permission.findAll({ where: { id: permissionIds } });
            await newRole.addPermissions(permissions);
        }

        res.status(201).json({ message: 'Tạo vai trò thành công!', role: newRole });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi tạo role', error: error.message });
    }
};
// 11. Lấy danh sách Role của viện mình
exports.getRoles = async (req, res) => {
    try {
        const hospitalId = req.user.hospitalId;
        const roles = await Role.findAll({
            where: { hospitalId: hospitalId },
            include: [{ model: Permission, through: { attributes: [] } }]
        });
        res.json({ data: roles });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server' });
    }
};
// 12. Xóa Role tùy chỉnh của viện mình
exports.deleteRole = async (req, res) => {
    try {
        const { id } = req.params;

        const role = await Role.findByPk(id);
        if (!role) { return res.status(404).json({ message: 'Không tìm thấy chức vụ này!' }); }
        const systemRoles = ['sieu_admin', 'admin_bv', 'NVYT', 'user'];
        if (systemRoles.includes(role.slug)) { return res.status(403).json({ message: '⛔ Đây là chức vụ mặc định của hệ thống, không thể xóa!' }); }
        const userCount = await role.countUsers();
        if (userCount > 0) {
            return res.status(400).json({ message: `⛔ Không thể xóa! Đang có ${userCount} nhân viên giữ chức vụ này. Hãy gỡ chức vụ của họ trước.` });
        }
        await role.destroy();
        res.json({ message: '✅ Đã xóa chức vụ thành công!' });
    } catch (error) {
        console.error("Lỗi xóa role:", error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};