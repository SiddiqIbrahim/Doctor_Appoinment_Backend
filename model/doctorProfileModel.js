
const { DataTypes } = require("sequelize");
const sequelize = require("../dbConfig/db");
const DoctorProfile = sequelize.define(
  "DoctorProfile",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      references: {
        model: "users",
        key: "id",
      },
    },

    specialization: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    qualification: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    experience: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    consultationFee: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },

    bio: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    profileImage: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    clinicAddress: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    approvalStatus: {
      type: DataTypes.ENUM(
        "pending",
        "approved",
        "rejected"
      ),
      defaultValue: "pending",
    },
  },
  {
    tableName: "doctor_profiles",
    timestamps: true,
    underscored: true,
  }
);


module.exports = DoctorProfile;
