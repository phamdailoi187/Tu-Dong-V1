const User = require('../models/user'); // Lưu ý: file model ông đặt là user (chữ thường)
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Op } = require("sequelize");

// 1. Đăng Ký
exports.register = async (req, res) => {
    try {
        const { username, password, role, email, fullName, employeeCode, phoneNumber } = req.body;

        if (role === 'admin') {
            return res.status(403).json({ message: 'Không thể tự đăng ký quyền Admin!' });
        }

        // Check trùng tên hoặc email
        const existingUser = await User.findOne({
            where: {
                [Op.or]: [{ username }, { email }]
            }
        });

        if (existingUser) {
            return res.status(400).json({ message: 'Tên đăng nhập hoặc Email đã tồn tại!' });
        }

        // Mã hóa pass
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Tạo user
        const newUser = await User.create({
            username, email, fullName, employeeCode, phoneNumber,
            password: hashedPassword,
            role: role || 'nvyt'
        });

        res.status(201).json({
            message: 'Đăng ký thành công! Vui lòng chờ cấp trên phê duyệt tài khoản.',
            user: newUser.username
        });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

// 2. Đăng Nhập
exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;

        // Tìm user
        const user = await User.findOne({ where: { username } });
        if (!user) {
            return res.status(404).json({ message: 'Không tìm thấy người dùng!' });
        }

        if (user.isActive === false) {
            return res.status(403).json({ message: 'Tài khoản của bạn chưa được phê duyệt!' });
        }

        // Check pass
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Sai mật khẩu!' });
        }

        // Cấp vé (Token)
        const token = jwt.sign(
            { id: user.id, role: user.role },
            process.env.JWT_SECRET || 'bi_mat',
            { expiresIn: '1d' }
        );

        res.status(200).json({
            message: 'Đăng nhập thành công!',
            token,
            role: user.role
        });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};