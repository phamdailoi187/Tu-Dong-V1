const User = require('../models/user');
const Role = require('../models/role');
const Permission = require('../models/permission');
const bcrypt = require('bcryptjs');

const seedData = async () => {
    try {
        // --- 1. TẠO ROLE (Giữ nguyên) ---
        const [roleSuperAdmin] = await Role.findOrCreate({ where: { slug: 'sieu_admin' }, defaults: { name: 'Siêu Quản Trị' } });
        const [roleAdminBV] = await Role.findOrCreate({ where: { slug: 'admin_bv' }, defaults: { name: 'Quản Trị Bệnh Viện' } });
        const [roleNVYT] = await Role.findOrCreate({ where: { slug: 'nvyt' }, defaults: { name: 'Nhân Viên Y Tế' } });

        // --- 2. TẠO PERMISSION (MỚI) ---
        const permissionsList = [
            // Nhóm Cá nhân
            { slug: 'view_profile', name: 'Xem hồ sơ cá nhân' },
            { slug: 'update_profile', name: 'Cập nhật hồ sơ' },
            { slug: 'change_password', name: 'Đổi mật khẩu' },
            // Nhóm Siêu Admin
            { slug: 'manage_hospital', name: 'Quản lý Bệnh viện' },
            { slug: 'create_admin_bv', name: 'Tạo Admin Bệnh viện' },
            // Nhóm Admin BV
            { slug: 'view_staff_list', name: 'Xem danh sách Nhân viên Y tế' },
            { slug: 'manage_staff', name: 'Quản lý Nhân viên Y tế' },
            { slug: 'view_hospital_stats', name: 'Xem báo cáo Bệnh viện' }
        ];

        // Lưu từng cái vào DB
        for (const perm of permissionsList) {
            await Permission.findOrCreate({
                where: { slug: perm.slug },
                defaults: { name: perm.name }
            });
        }

        console.log('✅ Đã tạo xong danh sách Permissions.');

        // --- 3. GÁN QUYỀN CHO ROLE (Mapping) ---

        // 3.1. Tìm lại các permission vừa tạo từ DB để lấy ID
        const allPerms = await Permission.findAll();

        // Hàm lọc nhanh
        const getPerms = (slugs) => allPerms.filter(p => slugs.includes(p.slug));

        // 3.2. Gán cho Siêu Admin (Full quyền Admin + Cá nhân)
        await roleSuperAdmin.addPermissions(getPerms([
            'view_profile', 'update_profile', 'change_password',
            'manage_hospital', 'create_admin_bv'
        ]));

        // 3.3. Gán cho Admin BV (Quyền BV + Cá nhân)
        await roleAdminBV.addPermissions(getPerms([
            'view_profile', 'update_profile', 'change_password',
            'manage_staff', 'view_hospital_stats', 'view_staff_list'
        ]));

        // 3.4. Gán cho NVYT (Chỉ quyền Cá nhân)
        await roleNVYT.addPermissions(getPerms([
            'view_profile', 'update_profile', 'change_password'
        ]));

        console.log('✅ Đã phân quyền xong!');

        // --- 4. TẠO SUPER ADMIN USER (Giữ nguyên đoạn cũ) ---
        const adminUser = await User.findOne({ where: { username: 'super_admin' } });
        if (!adminUser) {
            const hashedPassword = await bcrypt.hash('admin123', 10);
            const newAdmin = await User.create({
                username: 'super_admin',
                email: 'admin@hethong.com',
                password: hashedPassword,
                fullName: 'Quản Trị Viên Hệ Thống',
                isActive: true,
                hospitalId: null
            });
            await newAdmin.addRole(roleSuperAdmin);
            console.log('✅ Đã tạo Super Admin User.');
        }

    } catch (error) {
        console.error('❌ Lỗi Seeder:', error);
    }
};

module.exports = seedData;