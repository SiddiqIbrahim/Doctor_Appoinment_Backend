
const { DataTypes } = require("sequelize");
const sequelize = require("../dbConfig/db");

const Appointment = sequelize.define(
  "Appointment",
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

    doctor_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "doctor_profiles",
        key: "id",
      },
      onDelete: "CASCADE",
    },

    slot_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "availability_slots",
        key: "id",
      },
    },

    reason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    consultation_fee: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },

    admin_fee: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },

    status: {
      type: DataTypes.ENUM(
        "confirmed",
        "cancelled",
        "completed",
        "rescheduled"
      ),
      allowNull: false,
      defaultValue: "confirmed",
    },

    idempotency_key: {
      type: DataTypes.STRING(120),
      allowNull: true,
      unique: true,
    },
  },
  {
    tableName: "appointments",
    timestamps: true,
    underscored: true,
  }
);

module.exports = Appointment;
