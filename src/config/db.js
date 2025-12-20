const { Sequelize } = require('sequelize');
require('dotenv').config();

// Khởi tạo kết nối
// Cấu trúc: tên_db, username_db, password_db
const sequelize = new Sequelize(
    process.env.DB_NAME || 'tu_dong_db',
    process.env.DB_USER || 'postgres',
    process.env.DB_PASS || '123456',
    {
        host: process.env.DB_HOST || 'localhost',
        dialect: 'postgres',
        logging: false, // Tắt log SQL cho đỡ rối mắt
    }
);

const connectDB = async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ Đã kết nối PostgreSQL thành công!');
    } catch (error) {
        console.error('❌ Kết nối thất bại:', error);
    }
};

module.exports = { sequelize, connectDB };
