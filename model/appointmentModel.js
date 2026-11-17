
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
  },
  {
    tableName: "appointments",
    timestamps: true,
    underscored: true,
  }
);

module.exports = Appointment;
