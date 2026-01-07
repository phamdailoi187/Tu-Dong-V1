const User = require('../models/user');
const Role = require('../models/role');
const Session = require('../models/session');
const Hospital = require('../models/hospital');
const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

/* 1. Đăng Ký
exports.register = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // 1. Validate
        if (!username || !email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Vui lòng nhập đầy đủ thông tin.' 
            });
        }

        // 2. Check user tồn tại
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email đã tồn tại.' 
            });
        }

        // 3. Hash password TẠI ĐÂY
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 4. Tạo user với password ĐÃ hash
        const newUser = new User({
            username,
            email,
            password: hashedPassword // Lưu chuỗi đã mã hóa
        });

        await newUser.save();

        // 5. Phản hồi
        return res.status(201).json({
            success: true,
            message: 'Đăng ký thành công',
            data: { username: newUser.username, email: newUser.email }
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ 
            success: false, 
            message: 'Lỗi server.' 
        });
    }
};*/

// 2. Đăng Nhập
exports.login = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Validate required fields
        if (!username || !email || !password) {
            return res.status(400).json({ message: 'Vui lòng nhập tên đăng nhập, email và mật khẩu.' });
        }

        const user = await User.findOne({
            where: { username },
            include: [{
                model: Role,
                as: 'Roles',
                attributes: ['slug', 'name'],
                through: { attributes: [] }
            }]
        });

        if (!user) return res.status(404).json({ message: 'Tài khoản không tồn tại!' });

        if (!user.isActive) return res.status(403).json({ message: 'Tài khoản chưa được kích hoạt bởi Admin!' });

        // Ensure provided email matches the user's email in DB (case-insensitive)
        if ((user.email || '').toLowerCase() !== (email || '').toLowerCase()) {
            return res.status(400).json({ message: 'Email không khớp với tên đăng nhập.' });
        }

        const validPass = await bcrypt.compare(password, user.password_hash);
        if (!validPass) return res.status(400).json({ message: 'Sai mật khẩu!' });

        const roles = user.Roles ? user.Roles.map(r => r.slug) : [];

        const accessToken = jwt.sign(
            { id: user.id, roles: roles, hospitalId: user.hospitalId },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        const refreshToken = crypto.randomBytes(64).toString('hex');
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        await Session.create({
            user_id: user.id,
            refreshToken: refreshToken,
            deviceInfo: req.headers['user-agent'] || 'Unknown',
            ipAddress: req.ip || req.connection.remoteAddress,
            expiresAt: expiresAt
        });

        // Set refresh token as HttpOnly cookie so browser keeps session
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: false, // set to true in production with HTTPS
            sameSite: 'lax',
            path: '/',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        // 6. Trả kết quả (do not expose refresh token in JS-accessible response)
        res.json({
            message: 'Đăng nhập thành công!',
            accessToken,
            username: user.username,
            roles: user.Roles
        });

    } catch (error) {
        console.error("Lỗi đăng nhập:", error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

// 3. Gửi link quên mật khẩu (Forgot Password)
exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ where: { email } });

        if (!user) {
            return res.status(404).json({ message: 'Email này chưa đăng ký!' });
        }

        // 1. Tạo token ngẫu nhiên
        const token = crypto.randomBytes(20).toString('hex');

        // 2. Lưu token và thời hạn (1 tiếng) vào DB
        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 giờ
        await user.save();

        // 3. Giả lập gửi Email
        // Sau này thay đoạn này bằng nodemailer để gửi mail thật
        const resetLink = `http://localhost:8080/reset-password.html?token=${token}`;

        console.log("========================================");
        console.log("📧 EMAIL GỬI TỚI:", user.email);
        console.log("🔗 LINK RESET PASS:", resetLink);
        console.log("========================================");

        res.json({ message: 'Đã gửi link khôi phục mật khẩu (Check Console Server nhé!)' });

    } catch (error) {
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

exports.resetPassword = async (req, res) => {
    try {
        const { token } = req.params;
        const { password } = req.body;

        console.log("Đang reset pass cho token:", token);
        const user = await User.findOne({
            where: {
                resetPasswordToken: token,
                resetPasswordExpires: { [Op.gt]: Date.now() }
            }
        });

        if (!user) {
            return res.status(400).json({ message: 'Token không hợp lệ hoặc đã hết hạn.' });
        }

        const salt = await bcrypt.genSalt(10);
        user.password_hash = await bcrypt.hash(password, salt);

        user.resetPasswordToken = null;
        user.resetPasswordExpires = null;

        await user.save();

        return res.json({ message: 'Đổi mật khẩu thành công!' });

    } catch (error) {
        console.error("❌ LỖI RESET PASS:", error);
        return res.status(500).json({ message: 'Lỗi server: ' + error.message });
    }
};

// Refresh access token using refresh token cookie
exports.refreshToken = async (req, res) => {
    try {
        const refreshToken = req.cookies?.refreshToken;
        if (!refreshToken) return res.status(401).json({ message: 'Không tìm thấy refresh token' });

        const session = await Session.findOne({ where: { refreshToken, isRevoked: false } });
        if (!session) return res.status(401).json({ message: 'Session không hợp lệ hoặc đã bị thu hồi' });

        if (new Date(session.expiresAt) < new Date()) {
            return res.status(401).json({ message: 'Refresh token đã hết hạn' });
        }

        const user = await User.findByPk(session.user_id, {
            include: [{ model: Role, as: 'Roles', attributes: ['slug', 'name'], through: { attributes: [] } }]
        });
        if (!user) return res.status(404).json({ message: 'Người dùng không tồn tại' });

        const roles = user.Roles ? user.Roles.map(r => r.slug) : [];

        const newAccessToken = jwt.sign(
            { id: user.id, roles: roles, hospitalId: user.hospitalId },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        // Optionally extend session expiry on refresh
        const newExpiry = new Date();
        newExpiry.setDate(newExpiry.getDate() + 7);
        session.expiresAt = newExpiry;
        await session.save();

        return res.json({ accessToken: newAccessToken, username: user.username, roles: user.Roles });

    } catch (error) {
        console.error('Lỗi refresh token:', error);
        return res.status(500).json({ message: 'Lỗi server' });
    }
};

// Logout: revoke session and clear cookie
exports.logout = async (req, res) => {
    try {
        const refreshToken = req.cookies?.refreshToken;
        if (!refreshToken) {
            // ensure cookie cleared on client
            res.cookie('refreshToken', '', { httpOnly: true, path: '/', maxAge: 0 });
            return res.status(200).json({ message: 'Đã đăng xuất' });
        }

        const session = await Session.findOne({ where: { refreshToken } });
        if (session) {
            session.isRevoked = true;
            await session.save();
        }

        // clear cookie explicitly with same path
        res.cookie('refreshToken', '', { httpOnly: true, path: '/', maxAge: 0 });
        return res.json({ message: 'Đăng xuất thành công' });
    } catch (error) {
        console.error('Lỗi logout:', error);
        return res.status(500).json({ message: 'Lỗi server' });
    }
};