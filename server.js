const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const seedAdmin = require('./src/config/seeder'); // <--- Import seeder
const { connectDB, sequelize } = require('./src/config/db');

// Gọi các tuyến đường (Routes)
const authRoutes = require('./src/routes/authRoutes');
const userRoutes = require('./src/routes/userRoutes');

// Cấu hình
dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware (Bộ lọc)
app.use(cors()); // Cho phép Frontend gọi vào
app.use(express.json()); // Đọc được dữ liệu JSON gửi lên
// --- THÊM DÒNG NÀY (Kích hoạt thư mục public) ---
// Nó bảo server: "Thư mục chứa file tĩnh tên là 'public' nằm cùng cấp với file này"
app.use(express.static(path.join(__dirname, 'public')));
// -------------------------------------------------

// --- KẾT NỐI DATABASE ---
connectDB(); // 1. Thử kết nối

// 2. Đồng bộ Model vào Database
// LƯU Ý QUAN TRỌNG:
// - Lần đầu chạy hoặc khi mới sửa Model (thêm cột email): để force: true
// - Chạy xong 1 lần thì sửa lại thành force: false ngay (để không bị mất dữ liệu cũ)
sequelize.sync({ force: false }).then(async () => { // Nhớ force: true lần đầu để cập nhật cột mới
    console.log('✅ Database đã được đồng bộ!');
    await seedAdmin(); // <--- Chạy hàm tạo Admin
});

// --- ĐỊNH NGHĨA ĐƯỜNG DẪN (API) ---
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.get('/', (req, res) => {
    res.send('Server Tủ Đông đang chạy vù vù!');
});

// --- KHỞI ĐỘNG SERVER ---
app.listen(PORT, () => {
    console.log(`🚀 Server đang chạy tại: http://localhost:${PORT}`);
});