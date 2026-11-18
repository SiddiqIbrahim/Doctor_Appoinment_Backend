const {
  User,
  DoctorProfile,
  DoctorCertificate,
  AvailabilitySlot,
  Appointment,
  Prescription,
} = require("../model/associations");
const userSchema = require("../model/userModel");

const getAllDoctors = async (req, res) => {
  try {
    const doctors = await User.findAll({
      where: {
        role: "doctor",
      },
      attributes: ["id", "name", "email", "phone", "role"],

      include: [
        {
          model: DoctorProfile,
          as: "doctorProfile",
          required: true,
          where: {
            approvalStatus: "pending",
          },
          include: [
            {
              model: DoctorCertificate,
              as: "certificates",
              required: false,
            },
          ],
        },
      ],
    });
    // console.log("doctors", doctors);

    return res.status(200).json({
      response_code: 200,
      data: doctors,
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      msg: "Internal Server Error",
      error: error.message,
    });
  }
};

const doctorProfileUpdate = async (req, res) => {
  try {
    console.log("Hi1");

    const {
      specialization,
      qualification,
      experience,
      consultationFee,
      bio,
      clinicAddress,
    } = req.body;
    if (
      !specialization ||
      !qualification ||
      !experience ||
      !consultationFee ||
      !bio ||
      !clinicAddress
    ) {
      return res.status(400).json({ msg: "This all Filed are Required" });
    }
    await DoctorProfile.update(
      {
        specialization: specialization,
        qualification: qualification,
        experience: experience,
        consultationFee: consultationFee,
        bio: bio,
        clinicAddress: clinicAddress,
      },
      {
        where: {
          user_id: req.user,
        },
      },
    );
    console.log("Hi2");

    res.status(200).json({ msg: "Doctor Profile Updated Successfully" });
  } catch (error) {
    console.log(error);
  }
};

const getDoctorData = async (req, res) => {
  try {
    const userid = req.user;

    const getDoctor = await userSchema.findOne({
      where: {
        id: userid,
        role: "doctor",
      },
      attributes: ["id", "name", "email", "phone", "role"],
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
          ],
        },
      ],
    });
    console.log("getDoctor", getDoctor);
    res.status(200).json({
      response_code: 200,
      msg: "Doctor Profile fetch Successfully",
      doctor: getDoctor,
    });
  } catch (error) {
    console.log(error);
  }
};

const availabilityController = async (req, res) => {
  try {
    const { startTime, endTime } = req.body;
    if (!startTime || !endTime) {
      return res
        .status(400)
        .json({ msg: "Start time and end time are required" });
    }

    if (new Date(endTime) <= new Date(startTime)) {
      return res.status(400).json({ msg: "End time must be after start time" });
    }

    const getDoctor = await userSchema.findOne({
      where: {
        id: req.user,
        role: "doctor",
      },
      attributes: ["id", "name", "email", "phone", "role"],
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
          ],
        },
      ],
    });

    if (!getDoctor || !getDoctor.doctorProfile) {
      return res
        .status(404)
        .json({
          msg: "Doctor profile not found. Please complete your profile first.",
        });
    }

    const newSlot = await AvailabilitySlot.create({
      doctor_id: getDoctor.doctorProfile.id,
      start_time: startTime,
      end_time: endTime,
      status: "available",
    });

    return res.status(201).json({
      response_code: 200,
      msg: "Availability slot created successfully",
      data: newSlot,
    });
  } catch (error) {
    console.error("Error creating availability slot:", error);
    return res.status(500).json({
      msg: "Internal Server Error",
      error: error.message,
    });
  }
};

const getAvailability = async (req, res) => {
  try {
    const getDoctor = await userSchema.findOne({
      where: {
        id: req.user,
        role: "doctor",
      },
      attributes: ["id", "name", "email", "phone", "role"],
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
          ],
        },
      ],
    });

    if (!getDoctor || !getDoctor.doctorProfile) {
      return res.status(404).json({ msg: "Doctor profile not found" });
    }

    const getAvailabel = await AvailabilitySlot.findAll({
      where: {
        doctor_id: getDoctor.doctorProfile.id,
      },
      order: [["start_time", "ASC"]],
    });

    return res.status(200).json({
      response_code: 200,
      msg: "Doctor availability fetched successfully",
      data: getAvailabel,
    });
  } catch (error) {
    console.error("Error fetching availability:", error);
    return res.status(500).json({
      msg: "Internal Server Error",
      error: error.message,
    });
  }
};

const deleteAvailability = async (req, res) => {
  try {
    const { id } = req.params;
    const getDoctor = await userSchema.findOne({
      where: {
        id: req.user,
        role: "doctor",
      },
      attributes: ["id"],
      include: [
        {
          model: DoctorProfile,
          as: "doctorProfile",
          required: false,
        },
      ],
    });

    if (!getDoctor || !getDoctor.doctorProfile) {
      return res.status(404).json({ msg: "Doctor profile not found" });
    }

    const slot = await AvailabilitySlot.findOne({
      where: {
        id: id,
        doctor_id: getDoctor.doctorProfile.id,
      },
    });

    if (!slot) {
      return res.status(404).json({ msg: "Availability slot not found" });
    }

    if (slot.status === "booked") {
      return res
        .status(400)
        .json({ msg: "Cannot delete a slot that is already booked" });
    }

    await slot.destroy();

    return res.status(200).json({
      response_code: 200,
      msg: "Availability slot deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting availability slot:", error);
    return res.status(500).json({
      msg: "Internal Server Error",
      error: error.message,
    });
  }
};

const getApprovedDoctors = async (req, res) => {
  try {
    const doctors = await User.findAll({
      where: {
        role: "doctor",
      },
      attributes: ["id", "name", "email", "phone", "role"],
      include: [
        {
          model: DoctorProfile,
          as: "doctorProfile",
          required: true,
          where: {
            approvalStatus: "approved",
          },
          include: [
            {
              model: AvailabilitySlot,
              as: "availabilitySlots",
              required: true,
              where: {
                status: "available",
              },
            },
            {
              model: DoctorCertificate,
              as: "certificates",
              required: false,
            },
          ],
        },
      ],
      order: [["name", "ASC"]],
    });

    // Ensure availabilitySlots are sorted chronologically
    doctors.forEach((doc) => {
      if (
        doc.doctorProfile &&
        Array.isArray(doc.doctorProfile.availabilitySlots)
      ) {
        doc.doctorProfile.availabilitySlots.sort(
          (a, b) => new Date(a.start_time) - new Date(b.start_time),
        );
      }
    });

    return res.status(200).json({
      response_code: 200,
      msg: "Approved doctors fetched successfully",
      data: doctors,
    });
  } catch (error) {
    console.error("Error fetching approved doctors:", error);
    return res.status(500).json({
      msg: "Internal Server Error",
      error: error.message,
    });
  }
};

const getDoctorPatients = async (req, res) => {
  try {
    const userId = req.user;

    const doctorUser = await userSchema.findOne({
      where: {
        id: userId,
        role: "doctor",
      },
      include: [
        {
          model: DoctorProfile,
          as: "doctorProfile",
          required: true,
        },
      ],
    });

    if (!doctorUser || !doctorUser.doctorProfile) {
      return res.status(404).json({ msg: "Doctor profile not found" });
    }

    const doctorProfileId = doctorUser.doctorProfile.id;

    const appointments = await Appointment.findAll({
      where: {
        doctor_id: doctorProfileId,
      },
      include: [
        {
          model: User,
          as: "patient",
          attributes: ["id", "name", "email", "phone", "role", "created_at"],
        },
        {
          model: AvailabilitySlot,
          as: "slot",
          attributes: ["id", "start_time", "end_time", "status"],
        },
        {
          model: Prescription,
          as: "prescription",
          required: false,
        },
      ],
      order: [["created_at", "DESC"]],
    });

    return res.status(200).json({
      response_code: 200,
      msg: "Doctor patients and bookings fetched successfully",
      data: appointments,
    });
  } catch (error) {
    console.error("Error fetching doctor patients:", error);
    return res.status(500).json({
      msg: "Internal Server Error",
      error: error.message,
    });
  }
};

const updateAppointmentStatus = async (req, res) => {
  try {
    const userId = req.user;
    const { id } = req.params;
    const { status } = req.body;

    const doctorUser = await userSchema.findOne({
      where: { id: userId, role: "doctor" },
      include: [{ model: DoctorProfile, as: "doctorProfile", required: true }],
    });

    if (!doctorUser || !doctorUser.doctorProfile) {
      return res.status(404).json({ msg: "Doctor profile not found" });
    }

    const appointment = await Appointment.findOne({
      where: {
        id: id,
        doctor_id: doctorUser.doctorProfile.id,
      },
    });

    if (!appointment) {
      return res.status(404).json({ msg: "Appointment not found" });
    }

    appointment.status = status;
    await appointment.save();

    return res.status(200).json({
      response_code: 200,
      msg: `Appointment marked as ${status} successfully`,
      data: appointment,
    });
  } catch (error) {
    console.error("Error updating appointment status:", error);
    return res.status(500).json({
      msg: "Internal Server Error",
      error: error.message,
    });
  }
};

module.exports = {
  getAllDoctors,
  getApprovedDoctors,
  doctorProfileUpdate,
  getDoctorData,
  availabilityController,
  getAvailability,
  deleteAvailability,
  getDoctorPatients,
  updateAppointmentStatus,
};
