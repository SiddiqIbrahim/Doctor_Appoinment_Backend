const express = require("express")
const sequelize = require("./dbConfig/db")
const userRouter = require("./routes/userRouter")
require("./model/associations");
const cors = require("cors")
const path = require("path")
require("dotenv").config()
const app = express()
const doctorRouter = require("./routes/doctorRouter");
const adminRouter = require("./routes/adminRouter");
app.use("/uploads", express.static(path.join(__dirname, "uploads")))
app.use(express.json())
app.use(express.urlencoded({ extended: true }));
app.get("/", (req, res)=>(
    res.send("Server is working")
))

app.use(cors({
    origin:"*"
}))

const dbRun = async ()=>{
    try {
        await sequelize.authenticate()
        console.log("Mysql connect successfully");
        await sequelize.sync({alter: true})
        console.log("Database tables Synchronized");
        
    } catch (error) {
        console.log(error);
        
    }
}
dbRun()

app.use("/api/v1/user", userRouter)
app.use("/api/v1/doctor",doctorRouter)
app.use("/api/v1/approvel",adminRouter)
const PORT = process.env.PORT || 3001
app.listen(PORT, ()=>(
    console.log(`Server is Running${PORT}`)
    
))