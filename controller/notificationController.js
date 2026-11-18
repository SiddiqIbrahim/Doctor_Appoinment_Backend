const {
  Notification,
  User,
  Appointment,
  DoctorProfile,
  AvailabilitySlot,
} = require("../model/associations");
const { Op } = require("sequelize");

const syncUserReminders = async (userId) => {
  try {
    const user = await User.findByPk(userId, {
      attributes: ["id", "name", "email", "notifications_cleared_at"],
    });
    if (!user) return;

    const clearedAt = user.notifications_cleared_at
      ? new Date(user.notifications_cleared_at)
      : null;

    // Fetch user's appointments with doctor and slot information
    const appointments = await Appointment.findAll({
      where: { user_id: userId },
      include: [
        {
          model: DoctorProfile,
          as: "doctor",
          include: [
            {
              model: User,
              as: "user",
              attributes: ["id", "name", "email"],
            },
          ],
        },
        {
          model: AvailabilitySlot,
          as: "slot",
        },
      ],
      order: [["created_at", "DESC"]],
    });

    const now = new Date();

    for (const apt of appointments) {
      const docName = apt.doctor?.user?.name
        ? `Dr. ${apt.doctor.user.name}`
        : "Doctor";

      // Determine appointment slot time
      let slotStartTime = null;
      if (apt.slot?.start_time) {
        slotStartTime = new Date(apt.slot.start_time);
      } else if (apt.appointment_date) {
        slotStartTime = new Date(apt.appointment_date);
      }

      const formattedDate = slotStartTime
        ? slotStartTime.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })
        : "scheduled date";

      const formattedTime = slotStartTime
        ? slotStartTime.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "scheduled time";

      // 1. BOOKING CONFIRMATION NOTIFICATION
      const aptCreatedAt = new Date(apt.created_at);
      if (!clearedAt || aptCreatedAt > clearedAt) {
        const existingBookingNotif = await Notification.findOne({
          where: {
            user_id: userId,
            appointment_id: apt.id,
            type: "booking",
          },
        });

        if (!existingBookingNotif) {
          await Notification.create({
            user_id: userId,
            appointment_id: apt.id,
            title: "Appointment Booked & Confirmed",
            message: `Your consultation with ${docName} has been booked for ${formattedDate} at ${formattedTime}.`,
            type: "booking",
            is_read: false,
          });
        }
      }

      // If appointment is active and has a valid slot time, check reminder windows
      if (slotStartTime && apt.status !== "cancelled") {
        const diffMs = slotStartTime.getTime() - now.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);
        const diffMinutes = diffMs / (1000 * 60);

        // 2. 1-DAY REMINDER (Window: <= 24 hours and > 1 hour)
        if (diffHours <= 24 && diffHours > 1) {
          if (!clearedAt || now > clearedAt) {
            const existing1Day = await Notification.findOne({
              where: {
                user_id: userId,
                appointment_id: apt.id,
                type: "reminder_1day",
              },
            });

            if (!existing1Day) {
              await Notification.create({
                user_id: userId,
                appointment_id: apt.id,
                title: "Upcoming Appointment Reminder (1 Day)",
                message: `Reminder: You have an appointment scheduled with ${docName} tomorrow at ${formattedTime}.`,
                type: "reminder_1day",
                is_read: false,
              });
            }
          }
        }

        // 3. 1-HOUR REMINDER (Window: <= 1 hour and > 15 minutes)
        if (diffHours <= 1 && diffMinutes > 15) {
          if (!clearedAt || now > clearedAt) {
            const existing1Hour = await Notification.findOne({
              where: {
                user_id: userId,
                appointment_id: apt.id,
                type: "reminder_1hour",
              },
            });

            if (!existing1Hour) {
              await Notification.create({
                user_id: userId,
                appointment_id: apt.id,
                title: "Appointment Starting in 1 Hour",
                message: `Reminder: Your consultation with ${docName} starts in 1 hour at ${formattedTime}.`,
                type: "reminder_1hour",
                is_read: false,
              });
            }
          }
        }

        // 4. 15-MINUTES REMINDER (Window: <= 15 minutes and >= -30 minutes)
        if (diffMinutes <= 15 && diffMinutes >= -30) {
          if (!clearedAt || now > clearedAt) {
            const existing15Min = await Notification.findOne({
              where: {
                user_id: userId,
                appointment_id: apt.id,
                type: "reminder_15min",
              },
            });

            if (!existing15Min) {
              await Notification.create({
                user_id: userId,
                appointment_id: apt.id,
                title: "Consultation in 15 Minutes",
                message: `Your appointment with ${docName} begins in 15 minutes! Please be prepared for your consultation.`,
                type: "reminder_15min",
                is_read: false,
              });
            }
          }
        }
      }

      // 5. COMPLETION NOTIFICATION
      if (apt.status === "completed") {
        const aptUpdatedAt = new Date(apt.updated_at || apt.created_at);
        if (!clearedAt || aptUpdatedAt > clearedAt) {
          const existingCompletion = await Notification.findOne({
            where: {
              user_id: userId,
              appointment_id: apt.id,
              type: "completion",
            },
          });

          if (!existingCompletion) {
            await Notification.create({
              user_id: userId,
              appointment_id: apt.id,
              title: "Appointment Completed",
              message: `Your consultation with ${docName} on ${formattedDate} has been marked as completed. You can view your prescription in the Prescriptions tab.`,
              type: "completion",
              is_read: false,
            });
          }
        }
      }
    }
  } catch (err) {
    console.error("Error in syncUserReminders:", err);
  }
};

/**
 * Get all notifications for logged-in user
 */
const getUserNotifications = async (req, res) => {
  try {
    const userId = req.user;

    // Run synchronization to capture any new reminders or completions
    await syncUserReminders(userId);

    const notifications = await Notification.findAll({
      where: { user_id: userId },
      order: [["created_at", "DESC"]],
      include: [
        {
          model: Appointment,
          as: "appointment",
          attributes: ["id", "status", "reason", "consultation_fee"],
        },
      ],
    });

    const unreadCount = notifications.filter((n) => !n.is_read).length;
    const hasUnread = unreadCount > 0;

    return res.status(200).json({
      response_code: 200,
      hasUnread,
      unreadCount,
      count: notifications.length,
      data: notifications,
    });
  } catch (error) {
    console.error("Error in getUserNotifications:", error);
    return res.status(500).json({
      msg: "Failed to load notifications",
      error: error.message,
    });
  }
};

/**
 * Lightweight endpoint to check if user has unread notifications
 * Used by navbar & sidebar for displaying the red dot
 */
const getUnreadStatus = async (req, res) => {
  try {
    const userId = req.user;
    await syncUserReminders(userId);

    const unreadCount = await Notification.count({
      where: {
        user_id: userId,
        is_read: false,
      },
    });

    return res.status(200).json({
      response_code: 200,
      hasUnread: unreadCount > 0,
      unreadCount,
    });
  } catch (error) {
    console.error("Error in getUnreadStatus:", error);
    return res.status(500).json({
      msg: "Failed to check unread notification status",
      error: error.message,
    });
  }
};

/**
 * Mark notifications as read
 * If id provided in body: marks single notification
 * Otherwise: marks all unread notifications of the user as read
 */
const markNotificationsAsRead = async (req, res) => {
  try {
    const userId = req.user;
    const { id } = req.body || {};

    if (id) {
      await Notification.update(
        { is_read: true },
        { where: { id, user_id: userId } },
      );
    } else {
      await Notification.update(
        { is_read: true },
        { where: { user_id: userId, is_read: false } },
      );
    }

    return res.status(200).json({
      response_code: 200,
      msg: "Notifications marked as read",
      hasUnread: false,
    });
  } catch (error) {
    console.error("Error in markNotificationsAsRead:", error);
    return res.status(500).json({
      msg: "Failed to update notification read status",
      error: error.message,
    });
  }
};

/**
 * Clear all notifications permanently
 */
const clearAllNotifications = async (req, res) => {
  try {
    const userId = req.user;

    // Record timestamp so past events are not auto-regenerated
    await User.update(
      { notifications_cleared_at: new Date() },
      { where: { id: userId } },
    );

    // Delete all records permanently from database
    const deletedCount = await Notification.destroy({
      where: { user_id: userId },
    });

    return res.status(200).json({
      response_code: 200,
      msg: "All notifications cleared permanently",
      deletedCount,
      hasUnread: false,
    });
  } catch (error) {
    console.error("Error in clearAllNotifications:", error);
    return res.status(500).json({
      msg: "Failed to clear notifications",
      error: error.message,
    });
  }
};

/**
 * Delete a single notification permanently
 */
const deleteNotification = async (req, res) => {
  try {
    const userId = req.user;
    const { id } = req.params;

    const deleted = await Notification.destroy({
      where: { id, user_id: userId },
    });

    if (!deleted) {
      return res.status(404).json({ msg: "Notification not found" });
    }

    // Check remaining unread
    const remainingUnread = await Notification.count({
      where: { user_id: userId, is_read: false },
    });

    return res.status(200).json({
      response_code: 200,
      msg: "Notification deleted permanently",
      hasUnread: remainingUnread > 0,
    });
  } catch (error) {
    console.error("Error in deleteNotification:", error);
    return res.status(500).json({
      msg: "Failed to delete notification",
      error: error.message,
    });
  }
};

module.exports = {
  getUserNotifications,
  getUnreadStatus,
  markNotificationsAsRead,
  clearAllNotifications,
  deleteNotification,
  syncUserReminders,
};
