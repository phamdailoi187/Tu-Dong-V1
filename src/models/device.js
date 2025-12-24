const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Device = sequelize.define('Device', {
    // --- Các cột cơ bản ---
    name: {
        type: DataTypes.STRING,
        allowNull: false // VD: "Tủ Đông Vacxin 01"
    },
    serialNumber: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false // Mã cứng của chip ESP32
    },
    model: {
        type: DataTypes.STRING
    },

    // --- THAY THẾ CHO DEPARTMENT ---
    location: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "Chưa cập nhật" // VD: "Phòng Cấp Cứu", "Kho Dược"
    },
    // -----------------------------

    status: {
        type: DataTypes.ENUM('online', 'offline', 'warning'),
        defaultValue: 'offline'
    },
    currentTemp: {
        type: DataTypes.FLOAT,
        defaultValue: 0.0
    },
    thresholdTemp: {
        type: DataTypes.FLOAT,
        defaultValue: -20.0
    }
    // hospitalId sẽ tự có khi nối dây
}, {
    timestamps: true
});

module.exports = Device;