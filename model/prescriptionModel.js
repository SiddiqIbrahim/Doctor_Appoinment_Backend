
const { DataTypes } = require("sequelize");
const sequelize = require("../dbConfig/db");

const Prescription = sequelize.define(
  "Prescription",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    appointment_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      references: {
        model: "appointments",
        key: "id",
      },
      onDelete: "CASCADE",
    },

    diagnosis: {
      type: DataTypes.TEXT,
      allowNull: false,
    },

    medicines: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },

    instructions: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    follow_up_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
  },
  {
    tableName: "prescriptions",
    timestamps: true,
    underscored: true,
  }
);

module.exports = Prescription;
