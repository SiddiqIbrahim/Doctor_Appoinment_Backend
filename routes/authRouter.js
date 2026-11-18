const express = require("express");
const {
  forgotPassword,
  verifyResetToken,
  resetPassword,
} = require("../controller/authController");
const { authRateLimiter } = require("../middleware/rateLimitMiddleware");

const authRouter = express.Router();

// Forgot Password - Send reset link to email (with rate limiting)
authRouter.post("/forgot-password", authRateLimiter, forgotPassword);

// Verify Reset Token validity
authRouter.get("/verify-reset-token/:token", verifyResetToken);

// Reset Password - Hash received token, verify expiration, update password
authRouter.post("/reset-password/:token", authRateLimiter, resetPassword);

module.exports = authRouter;
