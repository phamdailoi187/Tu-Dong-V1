const Device = require('../models/device');

const Device = require('../models/device');

exports.addDevice = async (req, res) => {
    try {
        // Lấy thông tin từ body
        const { name, serialNumber, model, location } = req.body;

        // Lấy ID bệnh viện từ Token của ông Admin đang đăng nhập
        const hospitalId = req.user.hospitalId;

        // Tạo thiết bị mới
        const newDevice = await Device.create({
            name,
            serialNumber,
            model,
            location, // Lưu cái chuỗi "Phòng 301" vào đây
            hospitalId // Gắn luôn vào bệnh viện này
        });

        res.status(201).json({
            message: '✅ Thêm thiết bị thành công!',
            device: newDevice
        });

    } catch (error) {
        res.status(500).json({ message: 'Lỗi thêm thiết bị', error: error.message });
    }
};

exports.getDevicesByHospital = async (req, res) => {
    res.send("Hàm xem danh sách thiết bị - Chờ code");
};

// Hàm quan trọng: Nhận dữ liệu từ ESP32 gửi lên
exports.receiveData = async (req, res) => {
    res.send("Hàm nhận dữ liệu IoT - Chờ code");
};
