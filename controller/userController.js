const userSchema = require("../model/userModel");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { Op } = require("sequelize");
const DoctorProfile = require("../model/doctorProfileModel");
const DoctorCertificate = require("../model/doctorCertificateModel");
const signUp = async (req, res) => {
  try {
    // console.log(req.body);
    const { userName, email, password, phone, role } = req.body;
    // console.log("hi", userName, email, password, phone, role);
    const certificateFiles = req.files?.certificates || [];
    // console.log("certificateFiles", certificateFiles);

    if (!userName || !email || !password || !phone || !role) {
      return res.status(400).json({ msg: "All fields are required" });
    }

    // Strict email format validation - must fully end with .com
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.com$/i;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({
        msg: "Invalid email format. Email address must end with .com (e.g. name@example.com).",
        invalidEmail: true,
      });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ msg: "Password must be at least 6 characters long" });
    }

    if (role === "doctor" && certificateFiles.length === 0) {
      return res.status(400).json({
        msg: "Please upload at least one medical certificate for verification",
      });
    }

    const existing = await userSchema.findOne({
      where: {
        email: email.trim().toLowerCase(),
      },
    });
    if (existing) {
      return res.status(400).json({
        msg: "This email is already registered. Please sign in or use a different email.",
        emailExists: true,
      });
    }
    const hashPassword = await bcrypt.hash(password, 10);

    let adminFeeValue = null;
    if (role === "admin") {
      const existingAdmin = await userSchema.findOne({
        where: { role: "admin" },
        attributes: ["admin_fee"],
      });
      adminFeeValue =
        existingAdmin?.admin_fee !== undefined &&
        existingAdmin?.admin_fee !== null
          ? existingAdmin.admin_fee
          : 50;
    }

    const newUser = await userSchema.create({
      name: userName.trim(),
      email: email.trim().toLowerCase(),
      password: hashPassword,
      phone: phone.trim(),
      role: role,
      admin_fee: adminFeeValue,
    });
    // console.log("newUser", newUser);

    if (role === "doctor") {
      const doctorProfile = await DoctorProfile.create({
        userId: newUser.dataValues.id,
      });
      console.log("doctorProfile", doctorProfile);

      const certificateData = certificateFiles.map((file) => ({
        doctor_id: doctorProfile.dataValues.id,
        certificate_name: file.originalname,
        certificate_url: `/uploads/certificates/${file.filename}`,
        verification_status: "pending",
      }));

      const doctorCertificate = await DoctorCertificate.bulkCreate(certificateData);
    }

    res
      .status(200)
      .json({ response_code: 200, msg: "User Register Successfully" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      msg: "Internal Server Error",
      error: error.message,
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ msg: "This two filed are required" });
    }
    const existing = await userSchema.findOne({
      where: {
        email: email,
      },
    });
    if (!existing) {
      return res
        .status(400)
        .json({ msg: "This email is not exists enter vaild email" });
    }

    const correctPassword = await bcrypt.compare(password, existing.password);
    if (!correctPassword) {
      return res.status(400).json({ msg: "This password is not correct" });
    }
    if (existing.role === "doctor") {
      const doctorData = await DoctorProfile.findOne({
        where: {
          user_id: existing.id,
        },
      });
      if (!doctorData || doctorData.approvalStatus !== "approved") {
        const isRejected = doctorData?.approvalStatus === "rejected";
        return res.status(400).json({
          msg: isRejected
            ? "Your doctor account application was rejected by the administrator."
            : "Only Admin Approve you able to signIn. Your doctor account is not approved yet.",
          notApprovedDoctor: true,
          approvalStatus: doctorData?.approvalStatus || "pending",
        });
      }
    }

    const payload = {
      id: existing.id,
      user: existing.name,
      role: existing.role,
      email: existing.email,
    };

    const token = jwt.sign(payload, process.env.SECRET_KEY);
    res.status(200).json({
      response_code: 200,
      msg: "userLogin Successfully",
      token: token,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      msg: "Internal Server Error",
      error: error.message,
    });
  }
};

const getUser = async (req, res) => {
  try {
    const user = await userSchema.findOne({
      where: {
        id: req.user,
      },
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

    if (!user) {
      return res.status(404).json({ msg: "The user is not found" });
    }

    return res.status(200).json({
      response_code: 200,
      msg: "User profile fetched successfully",
      user: user,
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    return res.status(500).json({
      msg: "Internal Server Error",
      error: error.message,
    });
  }
};

const updateUserProfile = async (req, res) => {
  try {
    const userId = req.user;
    const { name, phone, email } = req.body;

    if (!name || !email) {
      return res.status(400).json({ msg: "Name and email are required" });
    }

    const user = await userSchema.findByPk(userId);
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    // Check if new email is already taken by another account
    if (email !== user.email) {
      const emailExists = await userSchema.findOne({
        where: {
          email: email,
          id: { [Op.ne]: userId },
        },
      });
      if (emailExists) {
        return res
          .status(400)
          .json({ msg: "This email is already in use by another account" });
      }
    }

    user.name = name;
    user.email = email;
    if (phone !== undefined) {
      user.phone = phone;
    }

    await user.save();

    const updatedUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      is_active: user.is_active,
      admin_fee: user.admin_fee,
      created_at: user.created_at,
      updated_at: user.updated_at,
    };

    return res.status(200).json({
      response_code: 200,
      msg: "User profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error updating user profile:", error);
    return res.status(500).json({
      msg: "Internal Server Error",
      error: error.message,
    });
  }
};

module.exports = { signUp, login, getUser, updateUserProfile };
