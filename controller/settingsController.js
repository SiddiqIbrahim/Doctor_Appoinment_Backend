const { ApplicationSettings, User } = require("../model/associations");
const fs = require("fs");
const path = require("path");

/**
 * Helper to ensure a single active settings record exists (Singleton pattern)
 */
const getOrCreateSettings = async () => {
  let settings = await ApplicationSettings.findOne();
  if (!settings) {
    settings = await ApplicationSettings.create({
      appName: "MediCare",
      logoUrl: null,
    });
  }
  return settings;
};

/**
 * Public Endpoint: GET /api/settings (or /api/v1/settings)
 * Returns current application name and logo URL without requiring authentication
 */
const getSettings = async (req, res) => {
  try {
    const settings = await getOrCreateSettings();

    return res.status(200).json({
      response_code: 200,
      appName: settings.appName || "MediCare",
      logoUrl: settings.logoUrl || null,
      data: settings,
    });
  } catch (error) {
    console.error("Error in getSettings:", error);
    return res.status(500).json({
      msg: "Failed to fetch application settings",
      error: error.message,
    });
  }
};

/**
 * Protected Admin Endpoint: POST /api/admin/upload-logo (or /api/v1/admin/upload-logo)
 * Only authenticated Admin users can upload/update the application logo.
 */
const uploadLogo = async (req, res) => {
  try {
    const userId = req.user;

    // 1. Verify User and Admin Role
    const user = await User.findByPk(userId);
    if (!user || user.role !== "admin") {
      // Remove uploaded file if unauthorized
      if (req.file && req.file.path) {
        fs.unlink(req.file.path, () => {});
      }
      return res.status(403).json({
        msg: "Access denied. Only administrators can modify application settings.",
      });
    }

    // 2. Validate uploaded file exists
    if (!req.file) {
      return res.status(400).json({
        msg: "No image file provided. Please select a PNG, JPG, JPEG, or WEBP image under 2MB.",
      });
    }

    // 3. Backend MIME Type & Size Validation (Defense in Depth)
    const allowedMimes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (!allowedMimes.includes(req.file.mimetype.toLowerCase())) {
      if (req.file.path) fs.unlink(req.file.path, () => {});
      return res.status(400).json({
        msg: "Invalid file format. Only PNG, JPG, JPEG, and WEBP formats are supported.",
      });
    }

    if (req.file.size > 2 * 1024 * 1024) {
      if (req.file.path) fs.unlink(req.file.path, () => {});
      return res.status(400).json({
        msg: "File size exceeds the 2 MB limit. Please upload a smaller image.",
      });
    }

    // 4. Relative URL path served statically by Express (/uploads/logos/...)
    const relativeLogoUrl = `/uploads/logos/${req.file.filename}`;

    // 5. Update the singleton ApplicationSettings record
    const settings = await getOrCreateSettings();

    // Optionally delete old logo file if local
    if (settings.logoUrl && settings.logoUrl.startsWith("/uploads/logos/")) {
      const oldFilename = path.basename(settings.logoUrl);
      const oldFilePath = path.join("uploads", "logos", oldFilename);
      if (oldFilePath !== req.file.path && fs.existsSync(oldFilePath)) {
        fs.unlink(oldFilePath, () => {});
      }
    }

    settings.logoUrl = relativeLogoUrl;
    await settings.save();

    return res.status(200).json({
      response_code: 200,
      msg: "Application logo uploaded and updated successfully",
      logoUrl: settings.logoUrl,
      appName: settings.appName,
      data: settings,
    });
  } catch (error) {
    console.error("Error in uploadLogo:", error);
    if (req.file && req.file.path) {
      fs.unlink(req.file.path, () => {});
    }
    return res.status(500).json({
      msg: "Failed to upload application logo",
      error: error.message,
    });
  }
};

/**
 * Update Application Name (Admin Only)
 */
const updateAppName = async (req, res) => {
  try {
    const userId = req.user;
    const user = await User.findByPk(userId);
    if (!user || user.role !== "admin") {
      return res.status(403).json({
        msg: "Access denied. Only administrators can modify application settings.",
      });
    }

    const { appName } = req.body;
    if (!appName || !appName.trim()) {
      return res.status(400).json({ msg: "Application name cannot be empty." });
    }

    const settings = await getOrCreateSettings();
    settings.appName = appName.trim();
    await settings.save();

    return res.status(200).json({
      response_code: 200,
      msg: "Application name updated successfully",
      appName: settings.appName,
      logoUrl: settings.logoUrl,
      data: settings,
    });
  } catch (error) {
    console.error("Error in updateAppName:", error);
    return res.status(500).json({
      msg: "Failed to update application settings",
      error: error.message,
    });
  }
};

module.exports = {
  getSettings,
  uploadLogo,
  updateAppName,
};
