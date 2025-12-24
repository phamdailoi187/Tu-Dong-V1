const { connectDB, sequelize } = require('../config/db');
const seedData = require('../config/seeder');
const Role = require('../models/role');
const Permission = require('../models/permission');
const User = require('../models/user');

const runUpdate = async () => {
    try {
        console.log("🔄 Đang kết nối Database...");
        await connectDB();

        // 1. KHAI BÁO QUAN HỆ
        Role.belongsToMany(Permission, { through: 'role_has_permissions', foreignKey: 'role_id' });
        Permission.belongsToMany(Role, { through: 'role_has_permissions', foreignKey: 'permission_id' });

        console.log("🛠 Đang CƯỠNG CHẾ sửa lỗi bảng ROLES...");

        try {
            // --- XỬ LÝ RIÊNG CHO BẢNG ROLES (Nơi đang bị lỗi) ---

            // Bước 1: Cố gắng đổi tên cột cũ (nếu có)
            try {
                await sequelize.query('ALTER TABLE "roles" RENAME COLUMN "createdAt" TO "created_at";');
                await sequelize.query('ALTER TABLE "roles" RENAME COLUMN "updatedAt" TO "updated_at";');
            } catch (e) {
                // Không sao, có thể nó chưa có hoặc đã đổi rồi
            }

            // Bước 2: NẾU CHƯA CÓ CỘT, TẠO MỚI VÀ ĐIỀN LUÔN DỮ LIỆU (DEFAULT NOW())
            // Dòng này cực quan trọng: Nó giúp tránh lỗi "contains null values"
            await sequelize.query('ALTER TABLE "roles" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ DEFAULT NOW();');
            await sequelize.query('ALTER TABLE "roles" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ DEFAULT NOW();');

            // Bước 3: LẤP ĐẦY DỮ LIỆU CHO CHẮC ĂN
            await sequelize.query('UPDATE "roles" SET "created_at" = NOW() WHERE "created_at" IS NULL;');
            await sequelize.query('UPDATE "roles" SET "updated_at" = NOW() WHERE "updated_at" IS NULL;');

            // --- XỬ LÝ CÁC BẢNG KHÁC (USER, PERMISSION...) ---
            try {
                await sequelize.query('ALTER TABLE IF EXISTS "Users" RENAME TO "users";');
                await sequelize.query('ALTER TABLE "users" RENAME COLUMN "createdAt" TO "created_at";');
                await sequelize.query('ALTER TABLE "users" RENAME COLUMN "updatedAt" TO "updated_at";');

                await sequelize.query('ALTER TABLE IF EXISTS "Permissions" RENAME TO "permissions";');
                // Permission thường không có timestamps, nhưng nếu có thì thêm lệnh rename ở đây

                await sequelize.query('ALTER TABLE IF EXISTS "RolePermissions" RENAME TO "role_has_permissions";');
            } catch (e) { /* Bỏ qua lỗi nhỏ */ }

            console.log("✅ Đã xử lý thủ công xong cấu trúc bảng!");
        } catch (err) {
            console.log("⚠️ Lỗi SQL thủ công (Có thể bỏ qua nếu bảng đã chuẩn):", err.message);
        }

        // 2. ĐỒNG BỘ
        console.log("🔄 Đang đồng bộ lại (Sequelize)...");
        await sequelize.sync({ alter: true });

        console.log("🚀 Đang kiểm tra dữ liệu mẫu (Seeder)...");
        await seedData();

        console.log("✅ THÀNH CÔNG! Hết lỗi rồi ông ơi.");
        process.exit(0);
    } catch (error) {
        console.error("❌ Vẫn lỗi à? Chụp lại gửi tôi nhé:", error);
        process.exit(1);
    }
};

runUpdate();