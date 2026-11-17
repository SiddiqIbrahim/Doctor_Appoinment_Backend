const userSchema = require("../model/userModel");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const DoctorProfile = require("../model/doctorProfileModel");
const DoctorCertificate = require("../model/doctorCertificateModel");
const signUp = async (req, res) => {
  try {
    // console.log(req.body);
    const { userName, email, password, phone, role } = req.body;
    // console.log("hi", userName, email, password, phone, role);
    const certificateFiles = req.files?.certificates || [];
    // console.log("certificateFiles", certificateFiles);

    if (!userName || !email || !password || !phone || !role) {
      return res.status(400).json({ msg: "This filed are required" });
    }
    const existing = await userSchema.findOne({
      where: {
        email: email,
      },
    });
    if (existing) {
      return res.status(400).json({ msg: "This user already exists" });
    }
    const hashPassword = await bcrypt.hash(password, 10);

    const newUser = await userSchema.create({
      name: userName,
      email: email,
      password: hashPassword,
      phone: phone,
      role: role,
    });
    // console.log("newUser", newUser);

    if (role === "doctor") {
      const doctorProfile =await  DoctorProfile.create({
        userId: newUser.dataValues.id,
      });
      console.log("doctorProfile", doctorProfile);
      
      if (certificateFiles.length === 0) {
        return res.status(400).json({
          msg: "Please upload at least one certificate",
        });
      }

      const certificateData = certificateFiles.map((file) => ({
        doctor_id: doctorProfile.dataValues.id,
        certificate_name: file.originalname,
        certificate_url: `/uploads/certificates/${file.filename}`,
        verification_status: "pending",
      }));

      const doctorCertificate =await DoctorCertificate.bulkCreate(certificateData);
    }

    res
      .status(200)
      .json({ response_code: 200, msg: "User Register Successfully" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      msg: "Internal Server Error",
      error: error.message,
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ msg: "This two filed are required" });
    }
    const existing = await userSchema.findOne({
      where: {
        email: email,
      },
    });
    if (!existing) {
      res
        .status(400)
        .json({ msg: "This email is not exists enter vaild email" });
    }

    const correctPassword = await bcrypt.compare(password, existing.password);
    if (!correctPassword) {
      return res.status(400).json({ msg: "This password is not correct" });
    }
    if(existing.role === "doctor"){
      const doctorData = await DoctorProfile.findOne({
        where:{
          user_id : existing.id, 
          approvalStatus : "approved"
        }
      })
      if(!doctorData){
        return res.status(400).json({msg: "Only Admin Approve you able to signIn"})
      }
    }

    const payload = {
      id: existing.id,
      user: existing.name,
      role: existing.role,
      email: existing.email,
    };

    const token = jwt.sign(payload, process.env.SECRET_KEY);
    res.status(200).json({
      response_code: 200,
      msg: "userLogin Successfully",
      token: token,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      msg: "Internal Server Error",
      error: error.message,
    });
  }
};

const getUser = async (req, res) => {
  console.log(req.user);
  try {
    const user = await userSchema.findOne({
      where: {
        id: req.user,
      },
    });
    if (!user) {
      res.status(400).json({ msg: "The user is not found" });
    }
    const userData = user.dataValues;
    console.log(userData);
    res
      .status(200)
      .json({
        response_code: 200,
        msg: "userFetch Successfully",
        user: userData,
      });
  } catch (error) {
    console.log(error);
  }
};

module.exports = { signUp, login, getUser };
