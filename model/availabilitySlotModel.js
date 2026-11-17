
const { DataTypes } = require("sequelize");
const sequelize = require("../dbConfig/db");

const AvailabilitySlot = sequelize.define(
  "AvailabilitySlot",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    doctor_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "doctor_profiles",
        key: "id",
      },
      onDelete: "CASCADE",
    },

    start_time: {
      type: DataTypes.DATE,
      allowNull: false,
    },

    end_time: {
      type: DataTypes.DATE,
      allowNull: false,
      validate: {
        isAfterStart(value) {
          if (
            this.start_time &&
            new Date(value) <= new Date(this.start_time)
          ) {
            throw new Error("End time must be after start time");
          }
        },
      },
    },

    status: {
      type: DataTypes.STRING(20),
      defaultValue: "available",
      validate: {
        isIn: [["available", "booked", "blocked"]],
      },
    },
  },
  {
    tableName: "availability_slots",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
  }
);

module.exports = AvailabilitySlot;
