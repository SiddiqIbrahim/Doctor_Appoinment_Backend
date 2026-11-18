const express = require("express");
const {
  bookAppointment,
  getMyAppointments,
  rescheduleAppointment,
  getDoctorAvailableSlots,
} = require("../controller/appointmentController");
const auth = require("../middleware/authmiddleware");

const appointmentRouter = express.Router();

appointmentRouter.post("/book", auth, bookAppointment);
appointmentRouter.get("/my-appointments", auth, getMyAppointments);
appointmentRouter.put("/reschedule/:id", auth, rescheduleAppointment);
appointmentRouter.get("/doctor-slots/:doctorId", auth, getDoctorAvailableSlots);

module.exports = appointmentRouter;
