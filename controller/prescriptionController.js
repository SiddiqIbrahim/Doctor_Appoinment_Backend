const {
  User,
  DoctorProfile,
  Appointment,
  Prescription,
} = require("../model/associations");
const userSchema = require("../model/userModel");

// Add or Update Prescription for an Appointment
const createOrUpdatePrescription = async (req, res) => {
  try {
    const userId = req.user;
    const { appointmentId, diagnosis, medicines, instructions, followUpDate } =
      req.body;

    if (!appointmentId) {
      return res.status(400).json({ msg: "Appointment ID is required" });
    }

    if (!diagnosis || !diagnosis.trim()) {
      return res.status(400).json({ msg: "Diagnosis is required" });
    }

    // Verify authenticated doctor
    const doctorUser = await userSchema.findOne({
      where: { id: userId, role: "doctor" },
      include: [{ model: DoctorProfile, as: "doctorProfile", required: true }],
    });

    if (!doctorUser || !doctorUser.doctorProfile) {
      return res
        .status(403)
        .json({ msg: "Only authorized doctors can write prescriptions" });
    }

    // Verify appointment belongs to this doctor
    const appointment = await Appointment.findOne({
      where: {
        id: appointmentId,
        doctor_id: doctorUser.doctorProfile.id,
      },
    });

    if (!appointment) {
      return res.status(404).json({
        msg: "Appointment not found or you are not authorized to prescribe for it",
      });
    }

    // Parse medicines
    let processedMedicines = medicines;
    if (typeof medicines === "string") {
      try {
        processedMedicines = JSON.parse(medicines);
      } catch {
        processedMedicines = [];
      }
    }
    if (!Array.isArray(processedMedicines)) {
      processedMedicines = [];
    }

    // Check if prescription already exists for this appointment
    let prescription = await Prescription.findOne({
      where: { appointment_id: appointmentId },
    });

    if (prescription) {
      prescription.diagnosis = diagnosis.trim();
      prescription.medicines = processedMedicines;
      prescription.instructions = instructions ? instructions.trim() : "";
      prescription.follow_up_date = followUpDate || null;
      await prescription.save();
    } else {
      prescription = await Prescription.create({
        appointment_id: appointmentId,
        diagnosis: diagnosis.trim(),
        medicines: processedMedicines,
        instructions: instructions ? instructions.trim() : "",
        follow_up_date: followUpDate || null,
      });
    }

    // Mark appointment as completed
    if (appointment.status !== "completed") {
      appointment.status = "completed";
      await appointment.save();
    }

    return res.status(200).json({
      response_code: 200,
      msg: "Prescription saved successfully",
      data: prescription,
    });
  } catch (error) {
    console.error("Error creating/updating prescription:", error);
    return res.status(500).json({
      msg: "Internal Server Error",
      error: error.message,
    });
  }
};

// Get Prescription by Appointment ID
const getPrescriptionByAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;

    const prescription = await Prescription.findOne({
      where: { appointment_id: appointmentId },
      include: [
        {
          model: Appointment,
          as: "appointment",
          include: [
            {
              model: User,
              as: "patient",
              attributes: ["id", "name", "email", "phone"],
            },
          ],
        },
      ],
    });

    if (!prescription) {
      return res.status(404).json({ msg: "Prescription not found" });
    }

    return res.status(200).json({
      response_code: 200,
      msg: "Prescription fetched successfully",
      data: prescription,
    });
  } catch (error) {
    console.error("Error fetching prescription:", error);
    return res.status(500).json({
      msg: "Internal Server Error",
      error: error.message,
    });
  }
};

// Get All Prescriptions for the Authenticated Patient/User
const getUserPrescriptions = async (req, res) => {
  try {
    const userId = req.user;

    const { AvailabilitySlot } = require("../model/associations");

    const prescriptions = await Prescription.findAll({
      include: [
        {
          model: Appointment,
          as: "appointment",
          where: {
            user_id: userId,
          },
          required: true,
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
        },
      ],
      order: [["created_at", "DESC"]],
    });

    return res.status(200).json({
      response_code: 200,
      msg: "User prescriptions fetched successfully",
      data: prescriptions,
    });
  } catch (error) {
    console.error("Error fetching user prescriptions:", error);
    return res.status(500).json({
      msg: "Internal Server Error",
      error: error.message,
    });
  }
};

module.exports = {
  createOrUpdatePrescription,
  getPrescriptionByAppointment,
  getUserPrescriptions,
};
