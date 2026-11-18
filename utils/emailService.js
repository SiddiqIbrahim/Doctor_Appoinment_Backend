const nodemailer = require("nodemailer");

/**
 * Configure Nodemailer transport using environment variables:
 * EMAIL_USER, EMAIL_PASS, and optional host/port.
 */
const createTransporter = () => {
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;

  if (!emailUser || !emailPass) {
    return null;
  }

  // If using Gmail or generic SMTP
  if (emailUser.includes("@gmail.com")) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: emailUser,
        pass: emailPass, // App Password
      },
    });
  }

  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_SECURE === "true",
    auth: {
      user: emailUser,
      pass: emailPass,
    },
  });
};

/**
 * Send password reset email with MediConnect branded template.
 * @param {Object} params
 * @param {string} params.to - Recipient email
 * @param {string} params.name - User's name
 * @param {string} params.resetUrl - Full password reset URL with token
 */
const sendPasswordResetEmail = async ({ to, name = "User", resetUrl }) => {
  const transporter = createTransporter();

  // Branded HTML email template
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset Your Password - MediConnect</title>
      <style>
        body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; }
        .wrapper { width: 100%; max-width: 600px; margin: 0 auto; padding: 24px 16px; }
        .card { background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; padding: 36px 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
        .logo-header { text-align: center; margin-bottom: 24px; }
        .brand-name { font-size: 24px; font-weight: 800; color: #1d4ed8; letter-spacing: -0.5px; }
        .brand-sub { font-size: 13px; color: #64748b; margin-top: 4px; }
        .title { font-size: 20px; font-weight: 700; color: #0f172a; margin-top: 16px; margin-bottom: 12px; }
        .body-text { font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px; }
        .btn-container { text-align: center; margin: 32px 0; }
        .btn { display: inline-block; background-color: #2563eb; color: #ffffff !important; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-size: 14px; font-weight: 700; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25); }
        .warning-box { background-color: #fef2f2; border: 1px solid #fee2e2; border-radius: 12px; padding: 14px 16px; margin: 24px 0; font-size: 13px; color: #991b1b; }
        .fallback-text { font-size: 12px; color: #94a3b8; word-break: break-all; margin-top: 24px; line-height: 1.5; }
        .footer { text-align: center; margin-top: 28px; font-size: 12px; color: #94a3b8; }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="card">
          <div class="logo-header">
            <div class="brand-name">MediConnect</div>
            <div class="brand-sub">Doctor Appointment & Consultation System</div>
          </div>
          
          <h1 class="title">Password Reset Request</h1>
          
          <p class="body-text">
            Hello <strong>${name}</strong>,<br><br>
            We received a request to reset the password for your MediConnect account. Click the secure button below to choose a new password:
          </p>

          <div class="btn-container">
            <a href="${resetUrl}" class="btn" target="_blank">Reset Password</a>
          </div>

          <div class="warning-box">
            ⏰ <strong>Important:</strong> This password reset link is valid for <strong>15 minutes</strong> only and can be used once.
          </div>

          <p class="body-text">
            If you did not request a password reset, you can safely ignore this email. Your current password will remain unchanged and your account stays secure.
          </p>

          <div class="fallback-text">
            If the button above does not work, copy and paste this link into your web browser:<br>
            <a href="${resetUrl}" style="color: #2563eb;">${resetUrl}</a>
          </div>
        </div>

        <div class="footer">
          &copy; ${new Date().getFullYear()} MediConnect Healthcare Platform. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  if (!transporter) {
    console.log("==================================================================");
    console.log("🔑 [DEV MODE - Nodemailer credentials not set in .env]");
    console.log(`✉️  Password reset requested for: ${to}`);
    console.log(`🔗 Password Reset Link (Valid for 15 minutes):`);
    console.log(`   ${resetUrl}`);
    console.log("==================================================================");
    return {
      success: true,
      mode: "dev-console",
      message: "Reset link generated and logged to server console (email credentials not configured in .env)",
    };
  }

  try {
    const info = await transporter.sendMail({
      from: `"MediConnect Healthcare" <${process.env.EMAIL_USER}>`,
      to,
      subject: "Reset Your Password - MediConnect",
      text: `Hello ${name},\n\nPlease reset your password using the following link (valid for 15 minutes):\n${resetUrl}\n\nIf you did not request a password reset, you can safely ignore this email.\n\nBest regards,\nMediConnect Team`,
      html: htmlContent,
    });

    console.log("✅ Password reset email sent successfully to:", to, "MessageId:", info.messageId);
    return {
      success: true,
      mode: "smtp",
      messageId: info.messageId,
    };
  } catch (error) {
    console.error("❌ Error sending password reset email via SMTP:", error);
    // Log link to console as safety fallback so user isn't stranded
    console.log("🔑 Fallback Password Reset Link:", resetUrl);
    throw error;
  }
};

module.exports = {
  sendPasswordResetEmail,
};
