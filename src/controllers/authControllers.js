const User = require('../models/user');
const Role = require('../models/role');
const Session = require('../models/session'); // <--- Import Session
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// 1. Đăng Ký
exports.register = async (req, res) => {
    try {
        const { username, password, email, fullName, employeeCode, phoneNumber, hospitalId } = req.body;

        if (!hospitalId) {
            return res.status(400).json({ message: 'Vui lòng chọn Bệnh viện công tác!' });
        }
        const hospitalExists = await Hospital.findByPk(hospitalId);
        if (!hospitalExists) {
            return res.status(404).json({ message: 'Bệnh viện không tồn tại!' });
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

        const newUser = await User.create({
            username,
            email,
            password: hashedPassword,
            fullName,
            employeeCode,
            phoneNumber,
            hospitalId,
            role: 'medical_staff', // <--- HARDCODE CỨNG: Mày là ai tao không cần biết, đăng ký ở đây thì chỉ là staff thôi.
            isActive: false        // <--- Chờ duyệt
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

        // 1. Tìm User + Kèm theo Role của họ
        const user = await User.findOne({
            where: { username },
            include: [{
                model: Role,
                attributes: ['slug'], // Chỉ lấy cái tên code (vd: sieu_admin)
                through: { attributes: [] } // Ẩn bảng trung gian cho gọn
            }]
        });

        // Check user tồn tại và đã kích hoạt
        if (!user) return res.status(404).json({ message: 'Tài khoản không tồn tại!' });
        if (!user.isActive) return res.status(403).json({ message: 'Tài khoản chưa được kích hoạt!' });

        // 2. Check Mật khẩu
        const validPass = await bcrypt.compare(password, user.password);
        if (!validPass) return res.status(400).json({ message: 'Sai mật khẩu!' });

        // 3. Lấy danh sách Role ra mảng (Ví dụ: ['sieu_admin'])
        const roles = user.Roles ? user.Roles.map(r => r.slug) : [];

        // 4. Tạo Access Token (Vé vào cửa ngắn hạn - 1 tiếng)
        const accessToken = jwt.sign(
            { id: user.id, roles: roles, hospitalId: user.hospitalId },
            process.env.JWT_SECRET || 'secret_key',
            { expiresIn: '1h' }
        );

        // 5. TẠO SESSION (Lưu vết đăng nhập)
        const refreshToken = crypto.randomBytes(64).toString('hex'); // Vé dài hạn
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // Hết hạn sau 7 ngày

        await Session.create({
            userId: user.id,
            refreshToken: refreshToken,
            deviceInfo: req.headers['user-agent'] || 'Unknown',
            ipAddress: req.ip || req.connection.remoteAddress,
            expiresAt: expiresAt
        });

        // 6. Trả kết quả về cho Client
        res.json({
            message: 'Đăng nhập thành công!',
            accessToken,
            refreshToken,
            username: user.username,
            roles: roles
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};