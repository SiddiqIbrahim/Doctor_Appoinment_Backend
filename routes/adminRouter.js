const express = require("express");
const approveDoctor = require("../adminApprovel/doctorApprovls");
const {
  getAllUsers,
  toggleUserStatus,
  deleteUser,
  getAllDoctorsAdmin,
  updateDoctorApprovalStatus,
  toggleDoctorActiveStatus,
  getAdminCommission,
  updateAdminCommission,
  getAdminProfile,
  updateAdminProfile,
  getAllAdmins,
  createAdmin,
  toggleAdminStatus,
  getAdminDashboardStats,
} = require("../controller/adminController");
const { uploadLogo, updateAppName } = require("../controller/settingsController");
const auth = require("../middleware/authmiddleware");
const { logoUpload } = require("../middleware/uploadMiddleware");

const adminRouter = express.Router();

// Dashboard Overview & Aggregate Metrics
adminRouter.get("/dashboard-stats", auth, getAdminDashboardStats);

// Legacy / Quick doctor approval
adminRouter.put("/status/:id", approveDoctor);

// User Management (strictly role: "user")
adminRouter.get("/users", auth, getAllUsers);
adminRouter.put("/users/:id/status", auth, toggleUserStatus);
adminRouter.delete("/users/:id", auth, deleteUser);

// Doctor Management (all doctors)
adminRouter.get("/doctors", auth, getAllDoctorsAdmin);
adminRouter.put("/doctor/:doctorProfileId/approval", auth, updateDoctorApprovalStatus);
adminRouter.put("/doctor/:userId/status", auth, toggleDoctorActiveStatus);

// Commission Management (stored in user table admin_fee column)
adminRouter.get("/commission", auth, getAdminCommission);
adminRouter.post("/commission", auth, updateAdminCommission);

// Admin Profile Management
adminRouter.get("/profile", auth, getAdminProfile);
adminRouter.put("/profile", auth, updateAdminProfile);

// Admin Creation & Management (Existing Admin can add new Admin)
adminRouter.get("/admins", auth, getAllAdmins);
adminRouter.post("/add-admin", auth, createAdmin);
adminRouter.put("/admin-status/:id", auth, toggleAdminStatus);

// Application Settings & Logo Upload (Admin Only)
adminRouter.post("/upload-logo", auth, logoUpload.single("logo"), uploadLogo);
adminRouter.put("/settings/app-name", auth, updateAppName);

module.exports = adminRouter;
