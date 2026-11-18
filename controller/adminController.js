const {
  User,
  Appointment,
  DoctorProfile,
  DoctorCertificate,
  AvailabilitySlot,
} = require("../model/associations");
const { Op } = require("sequelize");
const bcrypt = require("bcrypt");

// ==========================================
// USER MANAGEMENT (PATIENTS ONLY)
// ==========================================

// Get All Users where role is strictly "user" (patients only)
const getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      where: {
        role: "user", // Exclude doctor and admin
      },
      attributes: [
        "id",
        "name",
        "email",
        "phone",
        "role",
        "is_active",
        "created_at",
        "updated_at",
      ],
      include: [
        {
          model: Appointment,
          as: "appointments",
          attributes: ["status", "consultation_fee", "reason", "created_at"],
          required: false,
          include: [
            {
              model: DoctorProfile,
              as: "doctor",
              attributes: ["id", "specialization", "clinicAddress"],
              include: [
                {
                  model: User,
                  as: "user",
                  attributes: ["id", "name", "email"],
                },
              ],
            },
          ],
        },
      ],
      order: [["created_at", "DESC"]],
    });

    return res.status(200).json({
      response_code: 200,
      msg: "Patient users fetched successfully",
      count: users.length,
      data: users,
    });
  } catch (error) {
    console.error("Error in getAllUsers:", error);
    return res.status(500).json({
      msg: "Internal Server Error",
      error: error.message,
    });
  }
};

// Toggle user active status (activate / deactivate)
const toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findOne({
      where: {
        id: id,
        role: "user", // Strict: only normal users can be toggled here
      },
    });

    if (!user) {
      return res.status(404).json({ msg: "Patient user not found" });
    }

    user.is_active = !user.is_active;
    await user.save();

    return res.status(200).json({
      response_code: 200,
      msg: `User account has been ${user.is_active ? "activated" : "deactivated"} successfully`,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        is_active: user.is_active,
      },
    });
  } catch (error) {
    console.error("Error toggling user status:", error);
    return res.status(500).json({
      msg: "Internal Server Error",
      error: error.message,
    });
  }
};

// Delete user account (strict: role must be 'user')
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findOne({
      where: {
        id: id,
        role: "user", // Strict: only role 'user'
      },
    });

    if (!user) {
      return res.status(404).json({ msg: "Patient user not found" });
    }

    await user.destroy();

    return res.status(200).json({
      response_code: 200,
      msg: "Patient user account deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    return res.status(500).json({
      msg: "Internal Server Error",
      error: error.message,
    });
  }
};

// ==========================================
// DOCTOR MANAGEMENT (ALL DOCTORS)
// ==========================================

// Get All Doctors for Admin (Approved, Pending, and Rejected)
const getAllDoctorsAdmin = async (req, res) => {
  try {
    const doctors = await User.findAll({
      where: {
        role: "doctor",
      },
      attributes: [
        "id",
        "name",
        "email",
        "phone",
        "role",
        "is_active",
        "created_at",
        "updated_at",
      ],
      include: [
        {
          model: DoctorProfile,
          as: "doctorProfile",
          required: false,
          include: [
            {
              model: DoctorCertificate,
              as: "certificates",
              required: false,
            },
            {
              model: Appointment,
              as: "appointments",
              attributes: ["id", "status", "consultation_fee", "created_at"],
              required: false,
            },
            {
              model: AvailabilitySlot,
              as: "availabilitySlots",
              attributes: ["id", "start_time", "end_time", "status"],
              required: false,
            },
          ],
        },
      ],
      order: [["created_at", "DESC"]],
    });

    return res.status(200).json({
      response_code: 200,
      msg: "All doctors fetched successfully",
      count: doctors.length,
      data: doctors,
    });
  } catch (error) {
    console.error("Error in getAllDoctorsAdmin:", error);
    return res.status(500).json({
      msg: "Internal Server Error",
      error: error.message,
    });
  }
};

// Update Doctor Approval Status (approved | rejected | pending)
const updateDoctorApprovalStatus = async (req, res) => {
  try {
    const { doctorProfileId } = req.params;
    const { status } = req.body;

    if (!status || !["approved", "rejected", "pending"].includes(status)) {
      return res.status(400).json({
        msg: "Invalid status value. Must be 'approved', 'rejected', or 'pending'",
      });
    }

    const doctorProfile = await DoctorProfile.findByPk(doctorProfileId);
    if (!doctorProfile) {
      return res.status(404).json({ msg: "Doctor profile not found" });
    }

    doctorProfile.approvalStatus = status;
    await doctorProfile.save();

    // Also update certificates verification_status to match
    await DoctorCertificate.update(
      { verification_status: status },
      { where: { doctor_id: doctorProfileId } },
    );

    return res.status(200).json({
      response_code: 200,
      msg: `Doctor status updated to ${status} successfully`,
      data: doctorProfile,
    });
  } catch (error) {
    console.error("Error updating doctor approval status:", error);
    return res.status(500).json({
      msg: "Internal Server Error",
      error: error.message,
    });
  }
};

// Toggle Doctor Active Status (is_active in users table)
const toggleDoctorActiveStatus = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findOne({
      where: {
        id: userId,
        role: "doctor",
      },
    });

    if (!user) {
      return res.status(404).json({ msg: "Doctor account not found" });
    }

    user.is_active = !user.is_active;
    await user.save();

    return res.status(200).json({
      response_code: 200,
      msg: `Doctor account has been ${user.is_active ? "activated" : "deactivated"} successfully`,
      data: {
        id: user.id,
        name: user.name,
        is_active: user.is_active,
      },
    });
  } catch (error) {
    console.error("Error toggling doctor active status:", error);
    return res.status(500).json({
      msg: "Internal Server Error",
      error: error.message,
    });
  }
};

// ==========================================
// COMMISSION MANAGEMENT (ADMIN_FEE)
// ==========================================

// Get Current Admin Commission and Earnings Overview
const getAdminCommission = async (req, res) => {
  try {
    const userId = req.user;

    // Find the admin user
    let adminUser = await User.findOne({
      where: { id: userId, role: "admin" },
      attributes: ["id", "name", "email", "role", "admin_fee"],
    });

    // Fallback if accessed by another admin or first admin
    if (!adminUser) {
      adminUser = await User.findOne({
        where: { role: "admin" },
        attributes: ["id", "name", "email", "role", "admin_fee"],
      });
    }

    const currentFee =
      adminUser?.admin_fee !== undefined && adminUser?.admin_fee !== null
        ? adminUser.admin_fee
        : 50; // Default platform commission fee if not set yet

    // Get appointments stats to calculate commission metrics
    const appointments = await Appointment.findAll({
      attributes: [
        "id",
        "status",
        "consultation_fee",
        "admin_fee",
        "reason",
        "created_at",
      ],
      include: [
        {
          model: User,
          as: "patient",
          attributes: ["id", "name", "email"],
        },
        {
          model: DoctorProfile,
          as: "doctor",
          attributes: ["id", "specialization", "clinicAddress"],
          include: [
            {
              model: User,
              as: "user",
              attributes: ["id", "name", "email"],
            },
          ],
        },
      ],
      order: [["created_at", "DESC"]],
    });

    // Calculations: each appointment retains its snapshotted admin_fee recorded at booking time
    const confirmedOrCompleted = appointments.filter(
      (a) => a.status === "confirmed" || a.status === "completed",
    );
    const totalBookings = appointments.length;
    const totalConsultationValue = confirmedOrCompleted.reduce(
      (sum, a) => sum + (Number(a.consultation_fee) || 0),
      0,
    );
    const estimatedTotalCommission = confirmedOrCompleted.reduce((sum, a) => {
      const fee =
        a.admin_fee !== null && a.admin_fee !== undefined
          ? Number(a.admin_fee)
          : Number(currentFee);
      return sum + fee;
    }, 0);
    const doctorNetPayouts = Math.max(
      0,
      totalConsultationValue - estimatedTotalCommission,
    );

    return res.status(200).json({
      response_code: 200,
      msg: "Commission details fetched successfully",
      data: {
        admin_fee: currentFee,
        adminUser: {
          id: adminUser?.id,
          name: adminUser?.name,
          email: adminUser?.email,
        },
        stats: {
          totalBookings,
          confirmedOrCompletedCount: confirmedOrCompleted.length,
          totalConsultationValue,
          estimatedTotalCommission,
          doctorNetPayouts,
        },
        recentAppointments: appointments.slice(0, 20),
      },
    });
  } catch (error) {
    console.error("Error fetching admin commission:", error);
    return res.status(500).json({
      msg: "Internal Server Error",
      error: error.message,
    });
  }
};

// Update Admin Commission (Stored in user table admin_fee column)
const updateAdminCommission = async (req, res) => {
  try {
    const userId = req.user;
    const { admin_fee } = req.body;

    if (
      admin_fee === undefined ||
      admin_fee === null ||
      isNaN(Number(admin_fee))
    ) {
      return res
        .status(400)
        .json({ msg: "Please provide a valid numeric commission amount" });
    }

    const feeNum = Math.max(0, parseInt(admin_fee, 10));

    // Update the authenticated admin user's admin_fee column
    await User.update(
      { admin_fee: feeNum },
      { where: { id: userId, role: "admin" } },
    );

    // Also synchronize all admin accounts so system-wide platform commission stays consistent
    await User.update({ admin_fee: feeNum }, { where: { role: "admin" } });

    const updatedAdmin = await User.findByPk(userId, {
      attributes: ["id", "name", "email", "role", "admin_fee"],
    });

    return res.status(200).json({
      response_code: 200,
      msg: `Platform commission updated to ₹${feeNum} successfully`,
      data: {
        admin_fee: feeNum,
        user: updatedAdmin,
      },
    });
  } catch (error) {
    console.error("Error updating admin commission:", error);
    return res.status(500).json({
      msg: "Internal Server Error",
      error: error.message,
    });
  }
};
// Get Logged-in Admin Profile & Statistics
const getAdminProfile = async (req, res) => {
  try {
    const userId = req.user;

    let admin = await User.findOne({
      where: { id: userId, role: "admin" },
      attributes: [
        "id",
        "name",
        "email",
        "phone",
        "role",
        "is_active",
        "admin_fee",
        "created_at",
        "updated_at",
      ],
    });

    if (!admin) {
      // Fallback in case of first admin
      admin = await User.findOne({
        where: { role: "admin" },
        attributes: [
          "id",
          "name",
          "email",
          "phone",
          "role",
          "is_active",
          "admin_fee",
          "created_at",
          "updated_at",
        ],
      });
    }

    if (!admin) {
      return res.status(404).json({ msg: "Admin user profile not found" });
    }

    // System metrics for this admin
    const totalDoctors = await User.count({ where: { role: "doctor" } });
    const totalPatients = await User.count({ where: { role: "user" } });
    const totalAppointments = await Appointment.count();

    return res.status(200).json({
      response_code: 200,
      msg: "Admin profile fetched successfully",
      data: {
        admin,
        systemStats: {
          totalDoctors,
          totalPatients,
          totalAppointments,
        },
      },
    });
  } catch (error) {
    console.error("Error in getAdminProfile:", error);
    return res.status(500).json({
      msg: "Internal Server Error",
      error: error.message,
    });
  }
};

// Update Logged-in Admin Profile (name, email, phone, admin_fee, optional password)
const updateAdminProfile = async (req, res) => {
  try {
    const userId = req.user;
    const { name, email, phone, admin_fee, password } = req.body;

    let admin = await User.findOne({
      where: { id: userId, role: "admin" },
    });

    if (!admin) {
      admin = await User.findOne({
        where: { role: "admin" },
      });
    }

    if (!admin) {
      return res.status(404).json({ msg: "Admin user profile not found" });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({ msg: "Full Name is required" });
    }

    if (!email || !email.trim()) {
      return res.status(400).json({ msg: "Email Address is required" });
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.com$/i;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({
        msg: "Invalid email format. Please enter a valid email address.",
        invalidEmail: true,
      });
    }

    // Check unique email if changed
    if (email.trim().toLowerCase() !== admin.email.toLowerCase()) {
      const emailExists = await User.findOne({
        where: {
          email: email.trim(),
          id: { [Op.ne]: admin.id },
        },
      });
      if (emailExists) {
        return res
          .status(400)
          .json({ msg: "This email is already in use by another account" });
      }
    }

    admin.name = name.trim();
    admin.email = email.trim();
    if (phone !== undefined) {
      admin.phone = phone.trim();
    }
    if (
      admin_fee !== undefined &&
      admin_fee !== null &&
      !isNaN(Number(admin_fee))
    ) {
      admin.admin_fee = Math.max(0, parseInt(admin_fee, 10));
    }

    // Optional password update
    if (password && password.trim()) {
      if (password.trim().length < 6) {
        return res
          .status(400)
          .json({ msg: "New password must be at least 6 characters" });
      }
      admin.password = await bcrypt.hash(password.trim(), 10);
    }

    await admin.save();

    const updatedProfile = {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      phone: admin.phone,
      role: admin.role,
      is_active: admin.is_active,
      admin_fee: admin.admin_fee,
      created_at: admin.created_at,
      updated_at: admin.updated_at,
    };

    return res.status(200).json({
      response_code: 200,
      msg: "Admin profile updated successfully",
      data: updatedProfile,
    });
  } catch (error) {
    console.error("Error in updateAdminProfile:", error);
    return res.status(500).json({
      msg: "Internal Server Error",
      error: error.message,
    });
  }
};

// Get All Administrators
const getAllAdmins = async (req, res) => {
  try {
    const admins = await User.findAll({
      where: { role: "admin" },
      attributes: [
        "id",
        "name",
        "email",
        "phone",
        "role",
        "is_active",
        "admin_fee",
        "created_at",
        "updated_at",
      ],
      order: [["created_at", "DESC"]],
    });

    return res.status(200).json({
      response_code: 200,
      msg: "Admin list fetched successfully",
      count: admins.length,
      data: admins,
    });
  } catch (error) {
    console.error("Error in getAllAdmins:", error);
    return res.status(500).json({
      msg: "Internal Server Error",
      error: error.message,
    });
  }
};

// Create New Administrator by an existing logged-in Admin
const createAdmin = async (req, res) => {
  try {
    const creatorId = req.user;

    // Verify creator is an active admin
    const creator = await User.findOne({
      where: { id: creatorId, role: "admin" },
    });

    if (!creator) {
      return res.status(403).json({
        msg: "Only authenticated administrators can create new admin accounts",
      });
    }

    const { name, email, password, phone, admin_fee } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ msg: "Admin Full Name is required" });
    }

    if (!email || !email.trim()) {
      return res.status(400).json({ msg: "Email Address is required" });
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.com$/i;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({
        msg: "Invalid email format. Please enter a valid email address.",
        invalidEmail: true,
      });
    }

    if (!password || password.trim().length < 6) {
      return res.status(400).json({
        msg: "Initial password is required and must be at least 6 characters",
      });
    }

    // Check if email already registered
    const existing = await User.findOne({
      where: { email: email.trim().toLowerCase() },
    });

    if (existing) {
      return res.status(400).json({
        msg: `The email "${email.trim()}" is already registered on the platform (${existing.role} account).`,
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password.trim(), 10);

    // Determine default admin_fee (inherit creator's admin_fee or default to 50)
    const commissionFee =
      admin_fee !== undefined && admin_fee !== null && !isNaN(Number(admin_fee))
        ? Math.max(0, parseInt(admin_fee, 10))
        : creator.admin_fee || 50;

    const newAdmin = await User.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      phone: phone ? phone.trim() : null,
      role: "admin",
      is_active: true,
      admin_fee: commissionFee,
    });

    const safeAdminData = {
      id: newAdmin.id,
      name: newAdmin.name,
      email: newAdmin.email,
      phone: newAdmin.phone,
      role: newAdmin.role,
      is_active: newAdmin.is_active,
      admin_fee: newAdmin.admin_fee,
      created_at: newAdmin.created_at,
      updated_at: newAdmin.updated_at,
    };

    return res.status(201).json({
      response_code: 201,
      msg: `New administrator "${newAdmin.name}" created successfully!`,
      data: safeAdminData,
    });
  } catch (error) {
    console.error("Error creating new admin:", error);
    return res.status(500).json({
      msg: "Internal Server Error",
      error: error.message,
    });
  }
};

// Toggle Administrator Status (Activate / Suspend)
const toggleAdminStatus = async (req, res) => {
  try {
    const operatorId = req.user;
    const { id } = req.params;

    // Safety: Admin cannot deactivate themselves
    if (parseInt(id, 10) === parseInt(operatorId, 10)) {
      return res.status(400).json({
        msg: "Security Protection: You cannot deactivate your own administrator account.",
      });
    }

    const targetAdmin = await User.findOne({
      where: { id: id, role: "admin" },
    });

    if (!targetAdmin) {
      return res.status(404).json({ msg: "Administrator account not found" });
    }

    targetAdmin.is_active = !targetAdmin.is_active;
    await targetAdmin.save();

    return res.status(200).json({
      response_code: 200,
      msg: `Admin "${targetAdmin.name}" has been ${
        targetAdmin.is_active ? "activated" : "deactivated"
      } successfully.`,
      data: {
        id: targetAdmin.id,
        name: targetAdmin.name,
        is_active: targetAdmin.is_active,
      },
    });
  } catch (error) {
    console.error("Error toggling admin status:", error);
    return res.status(500).json({
      msg: "Internal Server Error",
      error: error.message,
    });
  }
};

const getAdminDashboardStats = async (req, res) => {
  try {
    // 1. Total Patients (role: 'user')
    const totalUsers = await User.count({ where: { role: "user" } });
    const activeUsers = await User.count({
      where: { role: "user", is_active: true },
    });
    const inactiveUsers = totalUsers - activeUsers;

    // 2. Doctors (role: 'doctor')
    const totalDoctors = await User.count({ where: { role: "doctor" } });
    const activeDoctors = await User.count({
      where: { role: "doctor", is_active: true },
    });

    // Doctor approval breakdown
    const allDoctors = await User.findAll({
      where: { role: "doctor" },
      attributes: ["id", "name", "email", "phone", "is_active", "created_at"],
      include: [
        {
          model: DoctorProfile,
          as: "doctorProfile",
          attributes: [
            "id",
            "specialization",
            "clinicAddress",
            "approvalStatus",
            "consultationFee",
          ],
          include: [
            {
              model: DoctorCertificate,
              as: "certificates",
              attributes: [
                "id",
                "certificate_name",
                "certificate_url",
                "verification_status",
              ],
              required: false,
            },
          ],
        },
      ],
      order: [["created_at", "DESC"]],
    });

    let approvedDoctors = 0;
    let pendingDoctors = 0;
    let rejectedDoctors = 0;
    const pendingDoctorsList = [];

    allDoctors.forEach((doc) => {
      const status = doc.doctorProfile?.approvalStatus?.toLowerCase();
      if (status === "approved") {
        approvedDoctors++;
      } else if (status === "rejected") {
        rejectedDoctors++;
      } else {
        // Pending or not set yet
        pendingDoctors++;
        pendingDoctorsList.push({
          id: doc.id,
          name: doc.name,
          email: doc.email,
          phone: doc.phone,
          specialization:
            doc.doctorProfile?.specialization || "General Medicine",
          clinicAddress: doc.doctorProfile?.clinicAddress || "Not specified",
          profileId: doc.doctorProfile?.id || null,
          approvalStatus: doc.doctorProfile?.approvalStatus || "pending",
          certificatesCount: doc.doctorProfile?.certificates?.length || 0,
          created_at: doc.created_at,
        });
      }
    });

    // 3. Appointments Breakdown
    const totalAppointments = await Appointment.count();
    const confirmedAppointments = await Appointment.count({
      where: { status: "confirmed" },
    });
    const completedAppointments = await Appointment.count({
      where: { status: "completed" },
    });
    const rescheduledAppointments = await Appointment.count({
      where: { status: "rescheduled" },
    });
    const cancelledAppointments = await Appointment.count({
      where: { status: "cancelled" },
    });

    // 4. Platform Commission Fee
    const adminUser = await User.findOne({
      where: { role: "admin" },
      attributes: ["admin_fee"],
    });
    const activePlatformFee =
      adminUser?.admin_fee !== undefined && adminUser?.admin_fee !== null
        ? Number(adminUser.admin_fee)
        : 50;

    // 5. Total Revenue & Appointments List
    const appointments = await Appointment.findAll({
      attributes: [
        "id",
        "status",
        "consultation_fee",
        "admin_fee",
        "reason",
        "created_at",
      ],
      include: [
        {
          model: User,
          as: "patient",
          attributes: ["id", "name", "email", "phone"],
        },
        {
          model: DoctorProfile,
          as: "doctor",
          attributes: ["id", "specialization", "clinicAddress"],
          include: [
            {
              model: User,
              as: "user",
              attributes: ["id", "name", "email"],
            },
          ],
        },
      ],
      order: [["created_at", "DESC"]],
    });

    // Non-cancelled appointments contribute to platform revenue and booking volume
    const revenueAppointments = appointments.filter(
      (a) =>
        a.status === "confirmed" ||
        a.status === "completed" ||
        a.status === "rescheduled",
    );

    const totalRevenue = revenueAppointments.reduce((sum, a) => {
      const fee =
        a.admin_fee !== null && a.admin_fee !== undefined
          ? Number(a.admin_fee)
          : activePlatformFee;
      return sum + fee;
    }, 0);

    const grossBookingVolume = revenueAppointments.reduce((sum, a) => {
      return sum + (Number(a.consultation_fee) || 0);
    }, 0);

    const doctorNetPayouts = Math.max(0, grossBookingVolume - totalRevenue);

    // Recent patient users
    const recentUsers = await User.findAll({
      where: { role: "user" },
      attributes: ["id", "name", "email", "phone", "is_active", "created_at"],
      order: [["created_at", "DESC"]],
      limit: 6,
    });

    return res.status(200).json({
      response_code: 200,
      msg: "Admin dashboard stats fetched successfully",
      data: {
        metrics: {
          totalUsers,
          activeUsers,
          inactiveUsers,
          totalDoctors,
          activeDoctors,
          approvedDoctors,
          pendingDoctors,
          rejectedDoctors,
          totalAppointments,
          confirmedAppointments,
          completedAppointments,
          rescheduledAppointments,
          cancelledAppointments,
          totalRevenue,
          grossBookingVolume,
          doctorNetPayouts,
          activePlatformFee,
        },
        recentAppointments: appointments.slice(0, 8),
        pendingDoctorsList: pendingDoctorsList.slice(0, 6),
        recentUsers,
      },
    });
  } catch (error) {
    console.error("Error in getAdminDashboardStats:", error);
    return res.status(500).json({
      msg: "Internal Server Error",
      error: error.message,
    });
  }
};

module.exports = {
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
};
