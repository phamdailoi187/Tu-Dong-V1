// 1. Load các biến môi trường
require('dotenv').config();

const express = require('express');
const cors = require('cors');

const app = express();

// 2. Middleware cơ bản
app.use(cors());
app.use(express.json()); // Cho phép server đọc JSON từ request body

// 3. Route kiểm tra cơ bản
app.get('/', (req, res) => {
    res.send('Server đang chạy tốt!');
});

// 4. Khởi động Server
const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
    console.log(`Server đang chạy trên cổng ${PORT}`);
});
