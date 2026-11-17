
const User = require("./userModel");
const DoctorProfile = require("./doctorProfileModel");
const DoctorCertificate = require("./doctorCertificateModel");
const AvailabilitySlot = require("./availabilitySlotModel");
const Appointment = require("./appointmentModel")
const Prescription = require("./prescriptionModel")
const Notification = require("./notificationModel")
User.hasOne(DoctorProfile, {
  foreignKey: "user_id",
  as: "doctorProfile",
  onDelete: "CASCADE",
});

DoctorProfile.belongsTo(User, {
  foreignKey: "user_id",
  as: "user",
});

DoctorProfile.hasMany(DoctorCertificate, {
  foreignKey: "doctor_id",
  as: "certificates",
  onDelete: "CASCADE",
});

DoctorCertificate.belongsTo(DoctorProfile, {
  foreignKey: "doctor_id",
  as: "doctor",
});
DoctorProfile.hasMany(AvailabilitySlot, {
  foreignKey: "doctor_id",
  as: "availabilitySlots",
  onDelete: "CASCADE",
});

AvailabilitySlot.belongsTo(DoctorProfile, {
  foreignKey: "doctor_id",
  as: "doctor",
});
User.hasMany(Appointment, {
  foreignKey: "user_id",
  as: "appointments",
});

Appointment.belongsTo(User, {
  foreignKey: "user_id",
  as: "patient",
});

DoctorProfile.hasMany(Appointment, {
  foreignKey: "doctor_id",
  as: "appointments",
});

Appointment.belongsTo(DoctorProfile, {
  foreignKey: "doctor_id",
  as: "doctor",
});

AvailabilitySlot.hasMany(Appointment, {
  foreignKey: "slot_id",
  as: "appointments",
});

Appointment.belongsTo(AvailabilitySlot, {
  foreignKey: "slot_id",
  as: "slot",
});
Appointment.hasOne(Prescription, {
  foreignKey: "appointment_id",
  as: "prescription",
  onDelete: "CASCADE",
});

Prescription.belongsTo(Appointment, {
  foreignKey: "appointment_id",
  as: "appointment",
});
User.hasMany(Notification, {
  foreignKey: "user_id",
  as: "notifications",
  onDelete: "CASCADE",
});

Notification.belongsTo(User, {
  foreignKey: "user_id",
  as: "user",
});

Appointment.hasMany(Notification, {
  foreignKey: "appointment_id",
  as: "notifications",
  onDelete: "SET NULL",
});

Notification.belongsTo(Appointment, {
  foreignKey: "appointment_id",
  as: "appointment",
});
module.exports = { User, DoctorProfile, DoctorCertificate,AvailabilitySlot,Appointment,Prescription, Notification };
