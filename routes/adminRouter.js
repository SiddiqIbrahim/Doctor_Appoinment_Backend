const express = require("express")
const approveDoctor = require("../adminApprovel/doctorApprovls")

const adminRouter = express.Router()

adminRouter.put("/status/:id",approveDoctor )

module.exports = adminRouter