const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const cookieParser = require('cookie-parser');
//const seedData2 = require('./src/config/seeder2');
const { connectDB, sequelize } = require('./src/config/db');

const User = require('./src/models/user');
const Hospital = require('./src/models/hospital');
const Role = require('./src/models/role');
const Permission = require('./src/models/permission');
const Session = require('./src/models/session');
// const Device = require('./src/models/device');
// const SensorData = require('./src/models/sensorData');

const authRoutes = require('./src/routes/authRoutes');
const userRoutes = require('./src/routes/userRoutes');
const superAdminRoutes = require('./src/routes/superAdminRoutes');
const bvAdminRoutes = require('./src/routes/bvAdminRoutes');
//const deviceRoutes = require('./src/routes/deviceRoutes');

Hospital.hasMany(User, { foreignKey: 'hospitalId' });
User.belongsTo(Hospital, { foreignKey: 'hospitalId' });
User.belongsToMany(Role, { through: 'user_has_roles', foreignKey: 'user_id', as: 'Roles' });
Role.belongsToMany(User, { through: 'user_has_roles', foreignKey: 'role_id', as: 'Users' });
Role.belongsToMany(Permission, { through: 'role_has_permissions', foreignKey: 'role_id' });
Permission.belongsToMany(Role, { through: 'role_has_permissions', foreignKey: 'permission_id' });
User.hasMany(Session, { foreignKey: 'user_id' });
Session.belongsTo(User, { foreignKey: 'user_id' });
Hospital.hasMany(Role, { foreignKey: 'hospitalId' });
Role.belongsTo(Hospital, { foreignKey: 'hospitalId' });

dotenv.config();
const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/super-admin', superAdminRoutes);
app.use('/api/bv-admin', bvAdminRoutes);
//app.use('/api/devices', deviceRoutes);

const startServer = async () => {
    try {
        await connectDB();

        await sequelize.sync({ alter: false });
        console.log('✅ Database đã được đồng bộ!');

        //await seedData2();

        app.listen(PORT, () => {
            console.log(`🚀 Server đang chạy tại: http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('❌ Lỗi khởi động server:', error);
    }
};

startServer();