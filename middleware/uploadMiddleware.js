const multer = require("multer");
const fs = require("fs");
const path = require("path");

// General Storage for certificates & profile pictures
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadDir;
    if (file.fieldname === "certificates") {
      uploadDir = path.join("uploads", "certificates");
    } else if (file.fieldname === "profile") {
      uploadDir = path.join("uploads", "profile");
    } else if (file.fieldname === "logo") {
      uploadDir = path.join("uploads", "logos");
    } else {
      uploadDir = path.join("uploads", "misc");
    }

    // Create folder if it doesn't exist
    fs.mkdirSync(uploadDir, { recursive: true });

    cb(null, uploadDir);
  },

  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `logo-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  const allowdTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

  if (allowdTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only PDF, JPG, PNG and WEBP files are allowed"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

// Dedicated Storage & Validation for Application Logo (Max 2MB, Images Only)
const logoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join("uploads", "logos");
    fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `app-logo-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
    cb(null, uniqueName);
  },
});

const logoFileFilter = (req, file, cb) => {
  const allowedMimes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
  if (allowedMimes.includes(file.mimetype.toLowerCase())) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file format. Only PNG, JPG, JPEG, and WEBP formats are supported."), false);
  }
};

const logoUpload = multer({
  storage: logoStorage,
  fileFilter: logoFileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024, // Maximum 2 MB
  },
});

module.exports = upload;
module.exports.logoUpload = logoUpload;
