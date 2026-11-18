const express = require("express");
const { getSettings } = require("../controller/settingsController");

const settingsRouter = express.Router();

// Public endpoint to fetch current appName and logoUrl
settingsRouter.get("/", getSettings);
settingsRouter.get("/settings", getSettings);

module.exports = settingsRouter;
