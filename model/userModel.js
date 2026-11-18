const { DataTypes } = require("sequelize");
const sequelize = require("../dbConfig/db");


const userSchema = sequelize.define("users", {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },

    email: {
      type: DataTypes.STRING(150),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },

    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },

    phone: {
      type: DataTypes.STRING(15),
      allowNull: true,
    },

    role: {
      type: DataTypes.ENUM("user", "doctor", "admin"),
      allowNull: false,
      defaultValue: "user",
    },

    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    admin_fee:{
        type: DataTypes.INTEGER,
      allowNull: true
    },
    notifications_cleared_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    resetPasswordToken: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: "reset_password_token",
    },
    resetPasswordExpires: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "reset_password_expires",
    },
  },
  {
    tableName: "users",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
);


module.exports = userSchema;
