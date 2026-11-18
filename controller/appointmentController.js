const sequelize = require("../dbConfig/db");
const {
  User,
  DoctorProfile,
  AvailabilitySlot,
  Appointment,
} = require("../model/associations");
const { Op } = require("sequelize");

// Book Appointment with Idempotency Approach
const bookAppointment = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const userId = req.user;
    const { doctorId, slotId, reason, consultationFee } = req.body;
    const idempotencyKey =
      req.headers["idempotency-key"] || req.body.idempotencyKey || null;

    if (!doctorId || !slotId) {
      await t.rollback();
      return res
        .status(400)
        .json({ msg: "Doctor ID and Slot ID are required" });
    }

    // 1. Check idempotency: If the client retried with the same idempotency key, return existing appointment
    if (idempotencyKey) {
      const existingByKey = await Appointment.findOne({
        where: { idempotency_key: idempotencyKey },
        include: [
          {
            model: DoctorProfile,
            as: "doctor",
            include: [
              {
                model: User,
                as: "user",
                attributes: ["id", "name", "email", "phone"],
              },
            ],
          },
          {
            model: AvailabilitySlot,
            as: "slot",
          },
        ],
        transaction: t,
      });

      if (existingByKey) {
        await t.commit();
        return res.status(200).json({
          response_code: 200,
          msg: "Appointment already confirmed (idempotent response)",
          data: existingByKey,
          isDuplicate: true,
        });
      }
    }

    // 2. Check if this specific slot is already booked in appointments
    const existingSlotBooking = await Appointment.findOne({
      where: {
        slot_id: slotId,
        status: { [Op.in]: ["confirmed", "rescheduled"] },
      },
      transaction: t,
    });

    if (existingSlotBooking) {
      await t.rollback();
      return res.status(409).json({
        msg: "This slot is already reserved by another appointment.",
      });
    }

    // 3. Lock and verify the availability slot
    const slot = await AvailabilitySlot.findOne({
      where: { id: slotId },
      lock: t.LOCK.UPDATE,
      transaction: t,
    });

    if (!slot) {
      await t.rollback();
      return res.status(404).json({ msg: "Availability slot not found" });
    }

    if (slot.status !== "available") {
      await t.rollback();
      return res.status(409).json({
        msg: "This time slot has already been booked or is no longer available.",
      });
    }

    // 4. Verify Doctor Profile exists
    const doctorProfile = await DoctorProfile.findOne({
      where: { id: doctorId },
      transaction: t,
    });

    if (!doctorProfile) {
      await t.rollback();
      return res.status(404).json({ msg: "Doctor profile not found" });
    }

    // Determine fee
    const feeToCharge =
      consultationFee !== undefined && consultationFee !== null
        ? consultationFee
        : doctorProfile.consultationFee || 0;

    // Snapshot active admin commission fee at the exact time of booking
    const adminRecord = await User.findOne({
      where: { role: "admin" },
      attributes: ["admin_fee"],
      transaction: t,
    });
    const snapshottedAdminFee =
      adminRecord?.admin_fee !== undefined && adminRecord?.admin_fee !== null
        ? Number(adminRecord.admin_fee)
        : 50;

    // 5. Create Appointment with locked admin_fee snapshot
    const newAppointment = await Appointment.create(
      {
        user_id: userId,
        doctor_id: doctorId,
        slot_id: slotId,
        reason: reason || "General Consultation",
        consultation_fee: feeToCharge,
        admin_fee: snapshottedAdminFee, // Snapshotted commission at booking time
        status: "confirmed",
        idempotency_key: idempotencyKey,
      },
      { transaction: t },
    );

    // 6. Update Slot status to 'booked'
    slot.status = "booked";
    await slot.save({ transaction: t });

    // Commit transaction
    await t.commit();

    // Fetch complete appointment details to return to frontend
    const fullAppointment = await Appointment.findOne({
      where: { id: newAppointment.id },
      include: [
        {
          model: DoctorProfile,
          as: "doctor",
          include: [
            {
              model: User,
              as: "user",
              attributes: ["id", "name", "email", "phone"],
            },
          ],
        },
        {
          model: AvailabilitySlot,
          as: "slot",
        },
      ],
    });

    return res.status(201).json({
      response_code: 200,
      msg: "Appointment booked successfully!",
      data: fullAppointment,
    });
  } catch (error) {
    if (!t.finished) {
      await t.rollback();
    }
    console.error("Error booking appointment:", error);

    // If duplicate key error caught from database unique constraint
    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({
        msg: "Duplicate booking detected. This slot is already booked or request has already been processed.",
      });
    }

    return res.status(500).json({
      msg: "Internal Server Error",
      error: error.message,
    });
  }
};

// Get User's Booking History
const getMyAppointments = async (req, res) => {
  try {
    const userId = req.user;

    const appointments = await Appointment.findAll({
      where: {
        user_id: userId,
      },
      include: [
        {
          model: DoctorProfile,
          as: "doctor",
          include: [
            {
              model: User,
              as: "user",
              attributes: ["id", "name", "email", "phone"],
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

    return res.status(200).json({
      response_code: 200,
      msg: "User appointments fetched successfully",
      data: appointments,
    });
  } catch (error) {
    console.error("Error fetching user appointments:", error);
    return res.status(500).json({
      msg: "Internal Server Error",
      error: error.message,
    });
  }
};

// Reschedule an Appointment (with 24-hour timeline rule)
const rescheduleAppointment = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const userId = req.user;
    const { id } = req.params;
    const { newSlotId } = req.body;

    if (!newSlotId) {
      await t.rollback();
      return res
        .status(400)
        .json({ msg: "New slot ID is required for rescheduling." });
    }

    const appointment = await Appointment.findOne({
      where: {
        id: id,
        user_id: userId,
      },
      include: [
        {
          model: AvailabilitySlot,
          as: "slot",
        },
      ],
      transaction: t,
    });

    if (!appointment) {
      await t.rollback();
      return res.status(404).json({ msg: "Appointment not found." });
    }

    if (appointment.status === "completed") {
      await t.rollback();
      return res
        .status(400)
        .json({ msg: "Completed appointments cannot be rescheduled." });
    }

    const now = new Date();
    const currentApptTime = new Date(appointment.slot?.start_time);

    // Ensure the current appointment hasn't already passed
    if (currentApptTime <= now) {
      await t.rollback();
      return res.status(400).json({
        msg: "Cannot reschedule an appointment that has already passed.",
      });
    }

    // Lock and check the new slot
    const newSlot = await AvailabilitySlot.findOne({
      where: { id: newSlotId },
      lock: t.LOCK.UPDATE,
      transaction: t,
    });

    if (!newSlot) {
      await t.rollback();
      return res.status(404).json({ msg: "Selected new time slot not found." });
    }

    if (newSlot.status !== "available") {
      await t.rollback();
      return res.status(409).json({
        msg: "This time slot is already booked or no longer available.",
      });
    }

    // Must be with the same doctor
    if (newSlot.doctor_id !== appointment.doctor_id) {
      await t.rollback();
      return res.status(400).json({
        msg: "Rescheduling is only allowed with the same doctor.",
      });
    }

    // Ensure new slot is in the future
    if (new Date(newSlot.start_time) <= now) {
      await t.rollback();
      return res
        .status(400)
        .json({ msg: "Cannot reschedule to a past time slot." });
    }

    // Cannot reschedule to the exact same slot
    if (appointment.slot_id === Number(newSlotId)) {
      await t.rollback();
      return res.status(400).json({ msg: "You have selected the same slot." });
    }

    // 1. Release previous slot back to 'available'
    if (appointment.slot_id) {
      await AvailabilitySlot.update(
        { status: "available" },
        { where: { id: appointment.slot_id }, transaction: t },
      );
    }

    // 2. Mark new slot as 'booked'
    newSlot.status = "booked";
    await newSlot.save({ transaction: t });

    // 3. Update appointment to new slot and status 'rescheduled'
    appointment.slot_id = newSlotId;
    appointment.status = "rescheduled";
    await appointment.save({ transaction: t });

    await t.commit();

    // Fetch updated appointment details to return
    const updatedAppointment = await Appointment.findOne({
      where: { id: appointment.id },
      include: [
        {
          model: DoctorProfile,
          as: "doctor",
          include: [
            {
              model: User,
              as: "user",
              attributes: ["id", "name", "email", "phone"],
            },
          ],
        },
        {
          model: AvailabilitySlot,
          as: "slot",
        },
      ],
    });

    return res.status(200).json({
      response_code: 200,
      msg: "Appointment successfully rescheduled within the 24-hour timeline.",
      data: updatedAppointment,
    });
  } catch (error) {
    if (!t.finished) {
      await t.rollback();
    }
    console.error("Error rescheduling appointment:", error);
    return res.status(500).json({
      msg: "Internal Server Error",
      error: error.message,
    });
  }
};

// Get Doctor's Available Slots (for rescheduling or booking)
const getDoctorAvailableSlots = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const now = new Date();

    const slots = await AvailabilitySlot.findAll({
      where: {
        doctor_id: doctorId,
        status: "available",
        start_time: { [Op.gt]: now },
      },
      order: [["start_time", "ASC"]],
    });

    return res.status(200).json({
      response_code: 200,
      msg: "Doctor available slots fetched successfully",
      data: slots,
    });
  } catch (error) {
    console.error("Error fetching doctor available slots:", error);
    return res.status(500).json({
      msg: "Internal Server Error",
      error: error.message,
    });
  }
};

module.exports = {
  bookAppointment,
  getMyAppointments,
  rescheduleAppointment,
  getDoctorAvailableSlots,
};
