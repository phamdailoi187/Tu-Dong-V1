const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Session = sequelize.define('Session', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    // userId sẽ tự động được tạo bởi quan hệ
    refreshToken: {
        type: DataTypes.TEXT, // Token này thường rất dài
        allowNull: false
    },
    deviceInfo: { // Lưu User-Agent (Chrome, Mobile...)
        type: DataTypes.STRING,
        allowNull: true
    },
    ipAddress: {
        type: DataTypes.STRING,
        allowNull: true
    },
    expiresAt: { // Thời điểm hết hạn phiên
        type: DataTypes.DATE,
        allowNull: false
    },
    isRevoked: { // Đánh dấu đã đăng xuất hay chưa
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
}, {
    timestamps: true, // Tự sinh createdAt (thời gian đăng nhập)
    tableName: 'user_sessions' // Đặt tên bảng đúng như sơ đồ ông thích
});

module.exports = Session;