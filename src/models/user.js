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

    // 2. GIỮ NGUYÊN ROLE
    role: {
        type: DataTypes.ENUM('admin', 'gsv', 'nvyt'),
        defaultValue: 'nvyt'
    },

    // 3. THÊM TRẠNG THÁI KÍCH HOẠT (QUAN TRỌNG)
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: false // Mặc định tạo xong là BỊ KHÓA, chờ duyệt  mới kích hoạt
    },
    role: {
        type: DataTypes.ENUM('admin', 'gsv', 'nvyt'), // Chỉ cho phép 3 quyền này
        defaultValue: 'nvyt' // Mặc định là nhân viên y tế
    }
}, {
    timestamps: true // Tự động tạo cột createdAt, updatedAt
});

module.exports = User;