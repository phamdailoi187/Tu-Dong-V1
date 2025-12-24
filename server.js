const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const seedAdmin = require('./src/config/seeder');
const { connectDB, sequelize } = require('./src/config/db');

const User = require('./src/models/user');
const Hospital = require('./src/models/hospital');
const Role = require('./src/models/role');
const Permission = require('./src/models/permission');
const Session = require('./src/models/session');
const Device = require('./src/models/device');
const SensorData = require('./src/models/sensorData');

Hospital.hasMany(User, { foreignKey: 'hospitalId' });
User.belongsTo(Hospital, { foreignKey: 'hospitalId' });
User.belongsToMany(Role, { through: 'User_Roles' });
Role.belongsToMany(User, { through: 'User_Roles' });
Role.belongsToMany(Permission, { through: 'Role_Permissions' });
Permission.belongsToMany(Role, { through: 'Role_Permissions' });
User.hasMany(Session, { foreignKey: 'userId' });
Session.belongsTo(User, { foreignKey: 'userId' });
Hospital.hasMany(Device, { foreignKey: 'hospitalId' });
Device.belongsTo(Hospital, { foreignKey: 'hospitalId' });
Device.hasMany(SensorData, { foreignKey: 'deviceId' });
SensorData.belongsTo(Device, { foreignKey: 'deviceId' });

// Gọi các tuyến đường (Routes)
const authRoutes = require('./src/routes/authRoutes');
const userRoutes = require('./src/routes/userRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
// Cấu hình
dotenv.config();
const app = express();
const PORT = process.env.PORT;
// Middleware (Bộ lọc)
app.use(cors()); // Cho phép Frontend gọi vào
app.use(express.json()); // Đọc được dữ liệu JSON gửi lên
app.use(express.static(path.join(__dirname, 'public'))); -
    app.use('/api/admin', adminRoutes);
connectDB();
sequelize.sync({ force: false }).then(async () => {
    console.log('✅ Database đã được đồng bộ (Cấu trúc mới)!');
    await seedAdmin(); // Tạo lại ông Super Admin
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.get('/', (req, res) => {
    res.send('Server Tủ Đông đang chạy vù vù!');
});

app.listen(PORT, () => {
    console.log(`🚀 Server đang chạy tại: http://localhost:${PORT}`);
});