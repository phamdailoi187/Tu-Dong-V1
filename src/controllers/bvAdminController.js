const User = require('../models/user');
const Role = require('../models/role');
const bcrypt = require('bcryptjs');

// 1. Tạo Nhân viên Y tế mới (Chức năng cốt lõi)
exports.createNVYT = async (req, res) => {
    try {
        const { username, password, fullName } = req.body;

        // Lấy ID bệnh viện từ chính Token của ông Admin BV đang đăng nhập
        const myHospitalId = req.user.hospitalId;

        // Kiểm tra trùng tên đăng nhập
        const existingUser = await User.findOne({ where: { username } });
        if (existingUser) return res.status(400).json({ message: 'Tên đăng nhập đã tồn tại!' });

        // Mã hóa mật khẩu
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Tạo User (Gắn cứng vào bệnh viện của Admin)
        const newUser = await User.create({
            username,
            password: hashedPassword,
            fullName,
            hospitalId: myHospitalId, // <--- Quan trọng: Lính của viện nào ở viện đó
            isActive: true // Admin tạo thì cho hoạt động luôn
        });

        // Tìm và gán role "nvyt"
        const roleNVYT = await Role.findOne({ where: { slug: 'nvyt' } });
        if (roleNVYT) {
            await newUser.addRole(roleNVYT);
        }

        res.status(201).json({
            message: '✅ Tạo nhân viên y tế thành công!',
            username: newUser.username
        });

    } catch (error) {
        res.status(500).json({ message: 'Lỗi tạo nhân viên', error: error.message });
    }
};

// 2. Xem danh sách NVYT của viện mình
exports.getAllNVYT = async (req, res) => {
    try {
        const myHospitalId = req.user.hospitalId;

        const staffs = await User.findAll({
            where: { hospitalId: myHospitalId },
            attributes: { exclude: ['password'] }, // Giấu mật khẩu đi
            include: [{
                model: Role,
                where: { slug: 'nvyt' }, // Chỉ lấy NVYT, không lấy ông Admin khác cùng viện
                attributes: ['name'],
                through: { attributes: [] }
            }]
        });

        res.status(200).json({
            message: 'Danh sách nhân viên y tế của bạn',
            count: staffs.length,
            data: staffs
        });

    } catch (error) {
        res.status(500).json({ message: 'Lỗi lấy danh sách', error: error.message });
    }
};

// 3. Xóa nhân viên (Nếu cần)
exports.deleteNVYT = async (req, res) => {
    try {
        const { userId } = req.params;
        const myHospitalId = req.user.hospitalId;

        // Tìm user cần xóa (Phải thuộc viện mình và là NVYT)
        const staff = await User.findOne({
            where: { id: userId, hospitalId: myHospitalId },
            include: [{ model: Role, where: { slug: 'nvyt' } }]
        });

        if (!staff) {
            return res.status(404).json({ message: 'Không tìm thấy nhân viên này trong viện của bạn!' });
        }

        // Xóa (Có thể dùng soft delete nếu muốn, ở đây tôi dùng xóa cứng cho gọn)
        await staff.destroy();

        res.status(200).json({ message: `🗑️ Đã xóa nhân viên: ${staff.fullName}` });

    } catch (error) {
        res.status(500).json({ message: 'Lỗi xóa nhân viên', error: error.message });
    }
};