const express = require("express")
const { signUp, login, getUser, updateUserProfile } = require("../controller/userController")
const {
  forgotPassword,
  verifyResetToken,
  resetPassword,
} = require("../controller/authController");
const { authRateLimiter } = require("../middleware/rateLimitMiddleware");
const {
  getUserNotifications,
  getUnreadStatus,
  markNotificationsAsRead,
  clearAllNotifications,
  deleteNotification,
} = require("../controller/notificationController")
const auth = require("../middleware/authmiddleware")
const upload = require("../middleware/uploadMiddleware")

const userRouter = express.Router()

userRouter.post("/signup", upload.fields([   
    { name: "certificates", maxCount: 5 },
  ]), signUp)
userRouter.post("/login", login)
userRouter.post("/forgot-password", authRateLimiter, forgotPassword)
userRouter.get("/verify-reset-token/:token", verifyResetToken)
userRouter.post("/reset-password/:token", authRateLimiter, resetPassword)
userRouter.get("/getUser", auth, getUser)
userRouter.put("/updateUser", auth, updateUserProfile)
userRouter.post("/updateUser", auth, updateUserProfile)

// User Notification Routes
userRouter.get("/notifications", auth, getUserNotifications)
userRouter.get("/notifications/unread-status", auth, getUnreadStatus)
userRouter.put("/notifications/mark-read", auth, markNotificationsAsRead)
userRouter.delete("/notifications", auth, clearAllNotifications)
userRouter.delete("/notifications/:id", auth, deleteNotification)

module.exports = userRouter