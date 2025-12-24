const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db'); // Lấy cái kết nối tạo trong file db.js

const User = sequelize.define('User', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false, // Bắt buộc phải có
        unique: true,     // Không được trùng email
        validate: {
            isEmail: true // Bắt buộc phải đúng định dạng a@b.c
        }
    },
    username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true // Không được trùng tên
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    // 1. THÊM THÔNG TIN ĐỊNH DANH CAO
    fullName: {
        type: DataTypes.STRING,
        allowNull: false // Bắt buộc phải có tên thật
    },
    employeeCode: {
        type: DataTypes.STRING,
        allowNull: true // Mã nhân viên (có thể bổ sung sau)
    },
    phoneNumber: {
        type: DataTypes.STRING,
        allowNull: true
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: false // Mặc định tạo xong là BỊ KHÓA, chờ duyệt  mới kích hoạt
    },
    hospitalId: {
        type: DataTypes.INTEGER,
        allowNull: true // Super Admin thì không có bệnh viện -> Null
        // Không cần khai báo references ở đây cũng được, 
        // vì đoạn User.belongsTo bên server.js sẽ lo việc liên kết khóa ngoại.
    }
}, {
    tableName: 'users', // <--- Thêm dòng này
    timestamps: true,
    createdAt: 'created_at', // Sửa luôn cho giống hình (nếu muốn)
    updatedAt: 'updated_at'  // Sửa luôn cho giống hình (nếu muốn)
});

module.exports = User;