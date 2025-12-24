const { connectDB } = require('../config/db');
const seedData = require('../config/seeder');

// 👇 1. IMPORT MODEL VÀO ĐÂY
const Role = require('../models/role');
const Permission = require('../models/permission');

const runUpdate = async () => {
    try {
        console.log("🔄 Đang kết nối Database...");
        await connectDB();

        // 👇 2. THÊM ĐOẠN NÀY ĐỂ "NỐI DÂY" (BẮT BUỘC)
        // Phải khai báo quan hệ ở đây thì nó mới đẻ ra hàm addPermissions
        Role.belongsToMany(Permission, { through: 'Role_Permissions' });
        Permission.belongsToMany(Role, { through: 'Role_Permissions' });
        // -----------------------------------------------------------

        console.log("🚀 Đang cập nhật quyền mới (Không mất dữ liệu cũ)...");
        await seedData();

        console.log("✅ Cập nhật thành công! Dữ liệu cũ vẫn an toàn.");
        process.exit(0);
    } catch (error) {
        console.error("❌ Lỗi:", error);
        process.exit(1);
    }
};

runUpdate();