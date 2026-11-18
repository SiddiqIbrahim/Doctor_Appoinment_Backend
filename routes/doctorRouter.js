const express = require("express")
const {
  getAllDoctors,
  getApprovedDoctors,
  doctorProfileUpdate,
  getDoctorData,
  availabilityController,
  getAvailability,
  deleteAvailability,
  getDoctorPatients,
  updateAppointmentStatus,
} = require("../controller/doctorController")
const auth = require("../middleware/authmiddleware")

const docRouter = express.Router()

docRouter.get("/getDoctor", getAllDoctors)
docRouter.get("/approvedDoctors", getApprovedDoctors)
docRouter.get("/getApprovedDoctors", getApprovedDoctors)
docRouter.post("/updateDoctor", auth, doctorProfileUpdate)
docRouter.get("/getDoctorData", auth, getDoctorData)
docRouter.post("/availability", auth, availabilityController)
docRouter.get("/availability", auth, getAvailability)
docRouter.delete("/availability/:id", auth, deleteAvailability)
docRouter.get("/myPatients", auth, getDoctorPatients)
docRouter.get("/patients", auth, getDoctorPatients)
docRouter.put("/appointment-status/:id", auth, updateAppointmentStatus)

module.exports = docRouter