const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { connectDB, sequelize } = require('./src/config/db');

// Gọi các tuyến đường (Routes)
const authRoutes = require('./src/routes/authRoutes');

// Cấu hình
dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware (Bộ lọc)
app.use(cors()); // Cho phép Frontend gọi vào
app.use(express.json()); // Đọc được dữ liệu JSON gửi lên

// --- KẾT NỐI DATABASE ---
connectDB(); // 1. Thử kết nối

// 2. Đồng bộ Model vào Database
// LƯU Ý QUAN TRỌNG:
// - Lần đầu chạy hoặc khi mới sửa Model (thêm cột email): để force: true
// - Chạy xong 1 lần thì sửa lại thành force: false ngay (để không bị mất dữ liệu cũ)
sequelize.sync({ force: false }).then(() => {
    console.log('✅ Database & Tables đã được đồng bộ!');
});

// --- ĐỊNH NGHĨA ĐƯỜNG DẪN (API) ---
// Bất cứ cái gì bắt đầu bằng /api/auth sẽ đi vào authRoutes
app.use('/api/auth', authRoutes);

// Route test server sống hay chết
app.get('/', (req, res) => {
    res.send('Server Tủ Đông đang chạy vù vù!');
});

// --- KHỞI ĐỘNG SERVER ---
app.listen(PORT, () => {
    console.log(`🚀 Server đang chạy tại: http://localhost:${PORT}`);
});