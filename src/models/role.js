const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Role = sequelize.define('Role', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: { // Tên hiển thị (VD: "Siêu Quản Trị")
        type: DataTypes.STRING,
        allowNull: false
    },
    slug: { // Tên dùng trong code (VD: "sieu_admin")
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    description: {
        type: DataTypes.STRING
    }
}, {
    tableName: 'roles', // <--- Thêm dòng này
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = Role;