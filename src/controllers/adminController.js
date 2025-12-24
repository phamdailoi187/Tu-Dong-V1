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