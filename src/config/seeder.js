const User = require('../models/user');
const bcrypt = require('bcryptjs');

const seedAdmin = async () => {
    try {
        // Kiểm tra xem đã có admin nào chưa
        const adminExists = await User.findOne({ where: { role: 'admin' } });

        if (!adminExists) {
            const hashedPassword = await bcrypt.hash('admin123', 10); // Pass mặc định là admin123

            await User.create({
                username: 'super_admin',
                email: 'phamdailoi187@gmail.com',
                password: hashedPassword,
                fullName: 'Quản Trị Viên Gốc Của Hệ Thống',
                role: 'admin',
                isActive: true // Admin gốc dĩ nhiên phải được active
            });
            console.log('✅ Đã tạo tài khoản Admin mặc định (super_admin / admin123)');
        }
    } catch (error) {
        console.error('❌ Lỗi tạo Admin:', error);
    }
};

module.exports = seedAdmin;