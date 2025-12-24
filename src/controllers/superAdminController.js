const Hospital = require('../models/hospital');
const User = require('../models/user');
const Role = require('../models/role'); // <--- Nhớ import Role
const bcrypt = require('bcryptjs');

exports.createHospitalAndAdmin = async (req, res) => {
    try {
        const { hospitalName, hospitalCode, adminUsername, adminPassword } = req.body;

        // 1. Tạo Bệnh viện
        const newHospital = await Hospital.create({
            name: hospitalName,
            code: hospitalCode
        });

        // 2. Tạo Admin (Lưu ý: KHÔNG truyền field role vào đây)
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(adminPassword, salt);

        const newAdmin = await User.create({
            username: adminUsername,
            email: adminUsername + '@benhvien.com', // Fake email để ko lỗi
            password: hashedPassword,
            fullName: 'Admin ' + hospitalName,
            hospitalId: newHospital.id,
            isActive: true
            // role: 'admin_bv' <-- DÒNG NÀY ĐÃ BỊ XÓA, ĐỪNG VIẾT VÀO
        });

        // 3. Gán Role "admin_bv" cho user này
        const adminRole = await Role.findOne({ where: { slug: 'admin_bv' } });
        if (adminRole) {
            await newAdmin.addRole(adminRole); // Sequelize tự động điền vào bảng trung gian
        }

        res.status(201).json({
            message: '✅ Tạo Bệnh viện và Admin thành công!',
            data: { hospital: newHospital.name, admin: newAdmin.username }
        });

    } catch (error) {
        console.error("Lỗi tạo BV:", error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

// 2. Lấy danh sách toàn bộ Bệnh viện
exports.getAllHospitals = async (req, res) => {
    try {
        const hospitals = await Hospital.findAll({
            include: [{
                model: User, // Lấy kèm thông tin ông Admin của viện đó
                as: 'Users', // (Cần check lại alias trong quan hệ nếu có lỗi)
                where: { '$Users.Roles.slug$': 'admin_bv' }, // Chỉ lấy user là admin
                attributes: ['username', 'fullName', 'isActive'],
                include: [{ model: Role, attributes: [] }],
                required: false
            }]
        });
        res.json({ message: 'Danh sách bệnh viện hệ thống', data: hospitals });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

// 3. Khóa/Mở khóa một Bệnh viện (Khóa bệnh viện -> Khóa luôn Admin BV đó)
exports.toggleHospitalStatus = async (req, res) => {
    try {
        const { hospitalId } = req.params;
        const { isActive } = req.body; // true hoặc false

        const hospital = await Hospital.findByPk(hospitalId);
        if (!hospital) return res.status(404).json({ message: 'Không tìm thấy bệnh viện' });

        // Cập nhật trạng thái
        // (Lưu ý: Ông có thể cần thêm cột isActive vào bảng Hospital nếu chưa có. 
        // Nếu chưa có thì tạm thời code logic khóa Admin của viện đó thôi)

        // Tìm Admin của viện này và khóa luôn
        const adminBV = await User.findOne({
            where: { hospitalId },
            include: [{ model: Role, where: { slug: 'admin_bv' } }]
        });

        if (adminBV) {
            adminBV.isActive = isActive;
            await adminBV.save();
        }

        res.json({ message: `Đã cập nhật trạng thái bệnh viện thành: ${isActive ? 'Hoạt động' : 'Bị khóa'}` });

    } catch (error) {
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};