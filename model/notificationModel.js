
const { DataTypes } = require("sequelize");
const sequelize = require("../dbConfig/db");

const Notification = sequelize.define(
  "Notification",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "users",
        key: "id",
      },
      onDelete: "CASCADE",
    },

    appointment_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "appointments",
        key: "id",
      },
      onDelete: "SET NULL",
    },

    title: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },

    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },

    type: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: "general",
    },

    is_read: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    tableName: "notifications",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
  }
);

module.exports = Notification;
