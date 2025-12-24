const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Permission = sequelize.define('Permission', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: { // VD: "Xem danh sách User"
        type: DataTypes.STRING,
        allowNull: false
    },
    slug: { // VD: "view_user_list"
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    resource: { // VD: "user", "device" (Để phân nhóm quyền cho dễ nhìn)
        type: DataTypes.STRING
    }
}, {
    timestamps: false
});

module.exports = Permission;