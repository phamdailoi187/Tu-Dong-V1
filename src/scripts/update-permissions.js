const { connectDB, sequelize } = require('../config/db');
const seedData = require('../config/seeder');
const Role = require('../models/role');
const Permission = require('../models/permission');
const User = require('../models/user');
const Session = require('../models/session');

const runUpdate = async () => {
    try {
        console.log("🔄 Đang kết nối Database...");
        await connectDB();

        // Khai báo lại để script không lỗi
        Role.belongsToMany(Permission, { through: 'role_has_permissions', foreignKey: 'role_id' });
        Permission.belongsToMany(Role, { through: 'role_has_permissions', foreignKey: 'permission_id' });
        User.hasMany(Session, { foreignKey: 'user_id' }); // <--- Script cũng phải hiểu đúng tên mới

        console.log("🛠 Đang SỬA CỘT userId -> user_id...");

        try {
            // 1. Cố gắng đổi tên cột userId -> user_id (Nếu cột cũ tên là userId)
            await sequelize.query('ALTER TABLE "user_sessions" RENAME COLUMN "userId" TO "user_id";');
            console.log("✅ Đã đổi tên userId thành user_id");
        } catch (e) {
            // Nếu lỗi nghĩa là không có cột userId, có thể nó chưa được tạo hoặc đã là user_id rồi
        }

        // 2. Đảm bảo cột user_id tồn tại
        await sequelize.query('ALTER TABLE "user_sessions" ADD COLUMN IF NOT EXISTS "user_id" INTEGER;');

        // 3. Quan trọng: Tạo ràng buộc khóa ngoại (Foreign Key) nếu chưa có
        // Để đảm bảo user_id này trỏ đúng về bảng users(id)
        try {
            await sequelize.query(`
                ALTER TABLE "user_sessions" 
                ADD CONSTRAINT "fk_user_sessions_user_id" 
                FOREIGN KEY ("user_id") 
                REFERENCES "users" ("id") 
                ON DELETE CASCADE ON UPDATE CASCADE;
            `);
        } catch (e) { /* Bỏ qua nếu đã có khóa ngoại */ }

        console.log("✅ Cấu trúc bảng user_sessions đã chuẩn user_id!");

        // Đồng bộ lại
        console.log("🔄 Đang đồng bộ lại...");
        await sequelize.sync({ alter: true });

        await seedData();

        console.log("🚀 THÀNH CÔNG! Giờ thì đăng nhập được rồi đấy.");
        process.exit(0);
    } catch (error) {
        console.error("❌ Lỗi:", error);
        process.exit(1);
    }
};

runUpdate();