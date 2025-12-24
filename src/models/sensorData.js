const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const SensorData = sequelize.define('SensorData', {
    temperature: { type: DataTypes.FLOAT, allowNull: false },
    humidity: { type: DataTypes.FLOAT }, // Nếu có đo độ ẩm
    voltage: { type: DataTypes.FLOAT }, // Đo pin (nếu chạy pin)
    // deviceId sẽ tự có khi nối quan hệ
}, { timestamps: true });

module.exports = SensorData;