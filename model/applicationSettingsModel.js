const { DataTypes } = require("sequelize");
const sequelize = require("../dbConfig/db");

const ApplicationSettings = sequelize.define(
  "ApplicationSettings",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    appName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: "MediCare",
    },
    logoUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "application_settings",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

module.exports = ApplicationSettings;
