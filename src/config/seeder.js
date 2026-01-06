const User = require('../models/user');
const Role = require('../models/role');
const Permission = require('../models/permission');
const Hospital = require('../models/hospital');
const bcrypt = require('bcryptjs');

const seedData = async () => {
    try {
        console.log("🌱 BẮT ĐẦU KHỞI TẠO DỮ LIỆU (SEEDING)...");

        const permissionsList = [
            { name: 'Xem hồ sơ cá nhân', slug: 'view_profile' },
            { name: 'Cập nhật hồ sơ cá nhân', slug: 'update_profile' },
            { name: 'Đổi mật khẩu', slug: 'change_password' },
            { name: 'Quản lý Bệnh viện', slug: 'manage_hospital' },
            { name: 'Tạo Admin Bệnh viện', slug: 'create_admin_hospital' },
            { name: 'Quản lý Nhân viên Y tế', slug: 'manage_staff' },
            { name: 'Xem danh sách Nhân viên Y tế', slug: 'view_staff_list' },
            { name: 'Quản lý Thiết bị', slug: 'manage_device' },
            { name: 'Xem báo cáo', slug: 'view_report' },
            { name: 'Quản lý Role (Phân quyền)', slug: 'manage_roles' },
        ];

        for (const p of permissionsList) { await Permission.findOrCreate({ where: { slug: p.slug }, defaults: p }); }
        const allPerms = await Permission.findAll();
        const getPerms = (slugs) => allPerms.filter(p => slugs.includes(p.slug));

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('123456', salt);
        const [superRole] = await Role.findOrCreate({ where: { slug: 'sieu_admin' }, defaults: { name: 'Siêu Admin', description: 'Quyền lực tối cao', hospitalId: null } });
        const superAdminPerms = getPerms(['view_profile', 'update_profile', 'change_password', 'manage_hospital', 'create_admin_hospital']);
        await superRole.addPermissions(superAdminPerms);

        const [bvAdminRole] = await Role.findOrCreate({ where: { slug: 'admin_bv' }, defaults: { name: 'Admin Bệnh Viện', description: 'Quản lý một bệnh viện', hospitalId: null } });
        const bvPermIds = allPerms.filter(p => p.slug !== 'manage_hospital' && p.slug !== 'create_admin_hospital');
        await bvAdminRole.addPermissions(bvPermIds);

        const [nvytRole] = await Role.findOrCreate({ where: { slug: 'NVYT' }, defaults: { name: 'Nhân viên y tế', description: 'Nhân viên y tế', hospitalId: null } });
        const nvytPerms = getPerms(['view_profile', 'update_profile', 'change_password']);
        await nvytRole.addPermissions(nvytPerms);
        console.log("✅ Đã tạo 3 Roles: Siêu Admin, Admin BV, NVYT.");

        const [hospitalHHMTW] = await Hospital.findOrCreate({
            where: { code: 'BV_HHMTW' },
            defaults: { name: 'Bệnh Viện Huyết học máu Trung ương', address: 'Số 5, phố Phạm Văn Bạch, phường Cầu Giấy, Hà Nội', phone: '0123456789' }
        });
        console.log("✅ Đã tạo Bệnh viện mẫu.");

        const [u1, c1] = await User.findOrCreate({
            where: { username: 'super_admin' },
            defaults: {
                fullName: 'Quản Trị Viên Hệ Thống',
                email: 'super@system.com',
                password_hash: hashedPassword,
                isActive: true,
                hospitalId: null
            }
        });
        if (c1) await u1.addRole(superRole);
        const [u2, c2] = await User.findOrCreate({
            where: { username: 'admin_bvhhmtw' },
            defaults: {
                fullName: 'Giám Đốc BV Huyết học máu Trung ương',
                email: 'director@hhmtw.vn',
                password_hash: hashedPassword,
                isActive: true,
                hospitalId: hospitalHHMTW.id
            }
        });
        if (c2) await u2.addRole(bvAdminRole);

        const [u3, c3] = await User.findOrCreate({
            where: { username: 'Nguyễn Văn A' },
            defaults: {
                fullName: 'BS. Nguyễn Văn A',
                email: 'a.bs@hhmtw.vn',
                password_hash: hashedPassword,
                isActive: true,
                hospitalId: hospitalHHMTW.id
            }
        });
        if (c3) await u3.addRole(nvytRole);

        console.log("🎉🎉🎉 SEEDING HOÀN TẤT!");
        console.log("------------------------------------------------");
        console.log("👉 Siêu Admin:  super_admin   / 123456");
        console.log("👉 Admin BV:    admin_bvhhmtw / 123456");
        console.log("👉 Bác Sĩ:      bacsi_a    / 123456");
        console.log("------------------------------------------------");

    } catch (error) {
        console.error("❌ LỖI SEEDING:", error);
    }
};

module.exports = seedData;