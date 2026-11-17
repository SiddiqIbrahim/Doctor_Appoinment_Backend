
const { DataTypes } = require("sequelize");
const sequelize = require("../dbConfig/db");

const DoctorCertificate = sequelize.define(
  "DoctorCertificate",
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

    certificate_name: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },

    certificate_url: {
      type: DataTypes.TEXT,
      allowNull: false,
    },

    verification_status: {
      type: DataTypes.STRING(20),
      defaultValue: "pending",
      validate: {
        isIn: [["pending", "approved", "rejected"]],
      },
    },
  },
  {
    tableName: "doctor_certificates",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
  }
);

module.exports = DoctorCertificate;
