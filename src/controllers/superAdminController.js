const User = require('../models/user');
const Hospital = require('../models/hospital');
const Role = require('../models/role');
const bcrypt = require('bcryptjs');
const Permission = require('../models/permission');
// 1. Lấy danh sách toàn bộ Bệnh viện
exports.getAllHospitals = async (req, res) => {
    try {
        // 1. Lấy danh sách bệnh viện kèm theo Users và Roles của họ
        const hospitals = await Hospital.findAll({
            order: [['created_at', 'DESC']],
            include: [{
                model: User,
                as: 'Users',
                attributes: ['id', 'username', 'fullName', 'email', 'phoneNumber', 'isActive'],
                required: false, // Lấy cả những BV chưa có nhân viên
                include: [{
                    model: Role,
                    as: 'Roles',
                    where: { slug: 'admin_bv' }, // Chỉ lấy role là admin_bv
                    required: false, // Quan trọng: Nếu user không có role admin thì Roles sẽ rỗng, nhưng User vẫn được lấy về
                    attributes: ['name', 'slug'],
                    include: [{
                        model: Permission,
                        as: 'Permissions',
                        attributes: ['name', 'slug'],
                        through: { attributes: [] }
                    }]
                }]
            }]
        });

        // 2. Xử lý dữ liệu (Mapping) để tìm đúng ông Admin
        const formattedData = hospitals.map(hospital => {
            const h = hospital.toJSON();

            let adminUser = null;

            // Kiểm tra xem bệnh viện này có nhân viên nào không
            if (h.Users && h.Users.length > 0) {
                // 👇 QUAN TRỌNG: Tìm trong danh sách nhân viên, ai có Role là 'admin_bv'
                adminUser = h.Users.find(u =>
                    u.Roles && u.Roles.length > 0 && u.Roles.some(r => r.slug === 'admin_bv')
                );
            }

            // Xóa danh sách Users dài dòng đi cho nhẹ, chỉ giữ lại thông tin Admin tìm được
            delete h.Users;

            // Gán kết quả vào adminInfo (Nếu không tìm thấy thì là null)
            h.adminInfo = adminUser || null;

            return h;
        });

        res.json({
            success: true,
            message: 'Lấy danh sách thành công',
            count: formattedData.length,
            data: formattedData
        });

    } catch (error) {
        console.error("Lỗi lấy danh sách BV:", error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};
// 2. Tạo Bệnh Viện Mới + Tự động tạo Admin + Tự gán quyền
exports.createHospitalAndAdmin = async (req, res) => {
    try {
        const { hospitalName, hospitalCode, address, phone, adminEmail, adminUsername, adminPassword } = req.body;
        const newHospital = await Hospital.create({ name: hospitalName, code: hospitalCode, address: address, phone: phone });
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(adminPassword, salt);

        const newAdmin = await User.create({
            username: adminUsername,
            email: adminEmail,
            password_hash: hashedPassword,
            fullName: 'Admin của ' + hospitalName,
            hospitalId: newHospital.id,
            isActive: true
        });
        const adminRole = await Role.findOne({ where: { slug: 'admin_bv' } });
        if (adminRole) { await newAdmin.addRole(adminRole); }
        res.status(201).json({
            message: '✅ Tạo Bệnh viện và Admin thành công!',
            data: { hospital: newHospital, admin: newAdmin.username }
        });
    } catch (error) {
        console.error("Lỗi tạo BV:", error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};
// 3. Xóa Bệnh Viện + Xóa tất cả nhân sự liên quan
exports.deleteHospital = async (req, res) => {
    try {
        const { id } = req.params;
        const hospital = await Hospital.findByPk(id);
        if (!hospital) {
            return res.status(404).json({ message: 'Không tìm thấy bệnh viện!' });
        }
        const users = await User.findAll({ where: { hospitalId: id } });
        for (const user of users) {
            if (user.setRoles) { await user.setRoles([]); }
            await user.destroy();
        }
        await hospital.destroy();
        res.json({ message: '✅ Đã xóa bay màu bệnh viện và toàn bộ nhân sự liên quan!' });
    } catch (error) {
        console.error("Lỗi xóa BV:", error);
        res.status(500).json({ message: 'Lỗi server: ' + error.message });
    }
};

// 4. Khóa/Mở khóa Bệnh Viện
exports.toggleHospitalStatus = async (req, res) => {
    try {
        const { hospitalId } = req.params;
        const { isActive } = req.body;
        const hospital = await Hospital.findByPk(hospitalId);
        if (!hospital) { return res.status(404).json({ message: 'Không tìm thấy BV' }); }
        hospital.isActive = isActive;
        await hospital.save();
        await User.update(
            { isActive: isActive },
            { where: { hospitalId: hospitalId } }
        );
        res.json({ message: 'Cập nhật trạng thái BV và toàn bộ nhân viên thành công!' });
    } catch (error) {
        console.error("Lỗi toggle status:", error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};