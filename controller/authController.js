const crypto = require("crypto");
const bcrypt = require("bcrypt");
const { Op } = require("sequelize");
const userSchema = require("../model/userModel");
const { sendPasswordResetEmail } = require("../utils/emailService");
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({
        msg: "Please provide an email address.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Basic email format validation
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/i;
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        msg: "Please provide a valid email address.",
      });
    }

    // Generic response returned in all scenarios to prevent email enumeration
    const genericResponse = {
      response_code: 200,
      msg: "If an account with that email exists, a password reset link has been sent to your inbox.",
    };

    const user = await userSchema.findOne({
      where: {
        email: normalizedEmail,
      },
    });

    if (!user) {
      // User not found: Return generic response safely without revealing existence
      return res.status(200).json(genericResponse);
    }

    // 1. Generate cryptographically secure random token (32 bytes = 64 hex chars)
    const rawToken = crypto.randomBytes(32).toString("hex");

    // 2. Hash the token with SHA-256 before persisting to PostgreSQL
    const tokenHash = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    // 3. Set token expiration to exactly 15 minutes from now
    const tokenExpires = new Date(Date.now() + 15 * 60 * 1000);

    // 4. Save hashed token and expiration to the user record
    user.resetPasswordToken = tokenHash;
    user.resetPasswordExpires = tokenExpires;
    await user.save();

    // 5. Construct reset URL
    const frontendUrl = (
      process.env.FRONTEND_URL || "http://localhost:5173"
    ).replace(/\/$/, "");
    const resetUrl = `${frontendUrl}/reset-password/${rawToken}`;

    // 6. Send email via Nodemailer
    try {
      await sendPasswordResetEmail({
        to: user.email,
        name: user.name,
        resetUrl,
      });
    } catch (emailError) {
      console.error("Failed to deliver reset email:", emailError);
      // Even if SMTP fails, the link was logged to console in dev mode
    }

    return res.status(200).json(genericResponse);
  } catch (error) {
    console.error("Error in forgotPassword controller:", error);
    return res.status(500).json({
      msg: "An unexpected error occurred while processing your request. Please try again later.",
      error: error.message,
    });
  }
};

/**
 * GET /api/auth/verify-reset-token/:token
 * Validates whether a reset token is still valid and not expired before the user fills the form.
 */
const verifyResetToken = async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res
        .status(400)
        .json({ valid: false, msg: "Reset token is missing." });
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const user = await userSchema.findOne({
      where: {
        resetPasswordToken: tokenHash,
        resetPasswordExpires: {
          [Op.gt]: new Date(),
        },
      },
      attributes: ["id", "name", "email"],
    });

    if (!user) {
      return res.status(400).json({
        valid: false,
        msg: "This password reset link is invalid or has expired. Please request a new one.",
      });
    }

    return res.status(200).json({
      valid: true,
      msg: "Token is valid.",
      data: {
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Error in verifyResetToken:", error);
    return res.status(500).json({
      valid: false,
      msg: "Unable to verify reset token.",
      error: error.message,
    });
  }
};

/**
 * POST /api/auth/reset-password/:token
 * Verifies token hash and expiration, updates password with bcrypt, and invalidates the token.
 */
const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password, confirmPassword } = req.body;

    if (!token) {
      return res.status(400).json({ msg: "Reset token is required." });
    }

    if (!password) {
      return res.status(400).json({ msg: "Please enter a new password." });
    }

    if (password.length < 6) {
      return res.status(400).json({
        msg: "Password must be at least 6 characters long.",
      });
    }

    if (confirmPassword !== undefined && password !== confirmPassword) {
      return res.status(400).json({
        msg: "New password and confirm password do not match.",
      });
    }

    // 1. Hash the incoming raw token to compare against database hash
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    // 2. Find user with matching active token where expiration > now
    const user = await userSchema.findOne({
      where: {
        resetPasswordToken: tokenHash,
        resetPasswordExpires: {
          [Op.gt]: new Date(),
        },
      },
    });

    if (!user) {
      return res.status(400).json({
        msg: "This password reset link is invalid or has expired. Please request a new reset link.",
      });
    }

    // 3. Hash new password with bcrypt (10 rounds)
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. Update user's password and clear reset token fields (prevent token reuse)
    user.password = hashedPassword;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    console.log(
      `✅ Password successfully reset for user ID: ${user.id} (${user.email})`,
    );

    return res.status(200).json({
      response_code: 200,
      msg: "Your password has been reset successfully! You can now sign in with your new password.",
    });
  } catch (error) {
    console.error("Error in resetPassword controller:", error);
    return res.status(500).json({
      msg: "An unexpected error occurred while resetting your password. Please try again.",
      error: error.message,
    });
  }
};

module.exports = {
  forgotPassword,
  verifyResetToken,
  resetPassword,
};
