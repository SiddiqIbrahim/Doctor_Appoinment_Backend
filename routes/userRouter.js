const express = require("express")
const {signUp, login, getUser} = require("../controller/userController")
const auth = require("../middleware/authmiddleware")
const upload = require("../middleware/uploadMiddleware")

const userRouter = express.Router()

userRouter.post("/signup",upload.fields([   
    { name: "certificates", maxCount: 5 },
  ]),signUp)
userRouter.post("/login", login)
userRouter.get("/getUser",auth, getUser)

module.exports = userRouter