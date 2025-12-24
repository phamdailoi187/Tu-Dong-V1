const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const seedData = require('./src/config/seeder');
const { connectDB, sequelize } = require('./src/config/db');

// --- 1. IMPORT MODELS (CHỈ GIỮ PHẦN USER/ADMIN) ---
const User = require('./src/models/user');
const Hospital = require('./src/models/hospital');
const Role = require('./src/models/role');
const Permission = require('./src/models/permission');
const Session = require('./src/models/session');
// const Device = require('./src/models/device');
// const SensorData = require('./src/models/sensorData');

// --- 2. IMPORT ROUTES (ĐÚNG TÊN FILE ÔNG CÓ) ---
const authRoutes = require('./src/routes/authRoutes');
const userRoutes = require('./src/routes/userRoutes');
const superAdminRoutes = require('./src/routes/superAdminRoutes');
const bvAdminRoutes = require('./src/routes/bvAdminRoutes');

// --- 3. CẤU HÌNH SERVER ---
dotenv.config();
const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- 4. THIẾT LẬP QUAN HỆ (RELATIONS) ---

// A. Bệnh viện - User
Hospital.hasMany(User, { foreignKey: 'hospitalId' });
User.belongsTo(Hospital, { foreignKey: 'hospitalId' });

// B. User - Role (Dùng bảng trung gian 'user_has_roles')
User.belongsToMany(Role, { through: 'user_has_roles', foreignKey: 'user_id' });
Role.belongsToMany(User, { through: 'user_has_roles', foreignKey: 'role_id' });

// C. Role - Permission (Dùng bảng trung gian 'role_has_permissions')
Role.belongsToMany(Permission, { through: 'role_has_permissions', foreignKey: 'role_id' });
Permission.belongsToMany(Role, { through: 'role_has_permissions', foreignKey: 'permission_id' });

// D. User - Session
User.hasMany(Session, { foreignKey: 'userId' });
Session.belongsTo(User, { foreignKey: 'userId' });

// --- 5. ĐĂNG KÝ ROUTES ---
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/super-admin', superAdminRoutes);
app.use('/api/bv-admin', bvAdminRoutes);

app.get('/', (req, res) => {
    res.send('✅ Server Tủ Đông (User Module) đang chạy!');
});

// --- 6. KHỞI ĐỘNG ---
const startServer = async () => {
    try {
        await connectDB();

        // force: false => Giữ dữ liệu cũ an toàn
        await sequelize.sync({ force: false });
        console.log('✅ Database đã được đồng bộ!');

        // Chạy seeder để tạo Super Admin nếu chưa có
        await seedData();

        app.listen(PORT, () => {
            console.log(`🚀 Server đang chạy tại: http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('❌ Lỗi khởi động server:', error);
    }
};

startServer();