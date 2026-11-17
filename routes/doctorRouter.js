const express = require("express")
const {getAllDoctors, doctorProfileUpdate,  getDoctorData, availabilityController} = require("../controller/doctorController")
const auth = require("../middleware/authmiddleware")

const docRouter = express.Router()

docRouter.get("/getDoctor", getAllDoctors)
docRouter.post("/updateDoctor",auth, doctorProfileUpdate)
docRouter.get("/getDoctorData",auth, getDoctorData)
docRouter.post("/availability",auth,availabilityController)

module.exports = docRouter