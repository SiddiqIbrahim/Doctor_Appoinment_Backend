const {
  User,
  DoctorProfile,
  DoctorCertificate,
  AvailabilitySlot,
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
    res
      .status(200)
      .json({
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
      return res.status(400).json({ msg: "This two filed are required" });
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
      await AvailabilitySlot.create(

        {
        doctor_id: getDoctor.doctorProfile.id,
      start_time: startTime,
      end_time : endTime
    },
    res.status(200).json({
        response_code : 200,
        msg: "DoctorAvailabitlity"
    })
);
  } catch (error) {
    console.log(error);
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
    const getAvailabel = await AvailabilitySlot.findAll({
      where: {
        doctor_id: getDoctor.doctorProfile.id,       
      },         
    });   
    console.log("getAvailabel", getAvailabel);
    
    res
      .status(200)
      .json({
        response_code: 200,
        msg: "Doctor Profile fetch Successfully",
        
      });
  } catch (error) {
    console.log(error);
  }
};

module.exports = { getAllDoctors, doctorProfileUpdate, getDoctorData, availabilityController, getAvailability };
