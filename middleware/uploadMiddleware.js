const multer = require("multer");
const fs = require("fs");
const path = require("path");
// const uploadDir = "uploads/cretificates";

// if (!fs.existsSync(uploadDir)) {
//   fs.mkdirSync(uploadDir, { recursive: true });
// }

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadDir;
    if (file.fieldname === "certificates") {
      uploadDir = path.join("uploads", "certificates");
    } else if (file.fieldname === "profile") {
      uploadDir = path.join("uploads", "profile");
    } else {
      return cb(new Error("Invalid file field"));
    }

    // Create folder if it doesn't exist
    fs.mkdirSync(uploadDir, { recursive: true });

    cb(null, uploadDir);
  },

  filename: (req, file, cb) => {
    const uniqueName =
      Date.now() +
      "-" +
      Math.round(Math.random() * 1e9) +
      path.extname(file.originalname);

    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  const allowdTypes = ["application/pdf", "image/jpeg", "image/png"];

  if (allowdTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cd(new Error("Only PDF, JPG and PNG files are allowed"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, //5MB
  },
});

module.exports = upload;
