const express = require("express");
const {
  createOrUpdatePrescription,
  getPrescriptionByAppointment,
  getUserPrescriptions,
} = require("../controller/prescriptionController");
const auth = require("../middleware/authmiddleware");

const prescriptionRouter = express.Router();

prescriptionRouter.post("/add", auth, createOrUpdatePrescription);
prescriptionRouter.post("/save", auth, createOrUpdatePrescription);
prescriptionRouter.get("/appointment/:appointmentId", auth, getPrescriptionByAppointment);
prescriptionRouter.get("/my-prescriptions", auth, getUserPrescriptions);
prescriptionRouter.get("/userPrescriptions", auth, getUserPrescriptions);

module.exports = prescriptionRouter;
