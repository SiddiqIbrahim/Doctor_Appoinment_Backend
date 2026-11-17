const DoctorCertificate = require("../model/doctorCertificateModel");
const DoctorProfile = require("../model/doctorProfileModel");

const approveDoctor = async (req, res) => {
  try {
    const { id } = req.params;
    console.log("id", id);

    const { status } = req.body;
    const approvelStatus = status === true ? "approved" : "rejected";

    await DoctorProfile.update(
      {
        approvalStatus: approvelStatus,
      },
      {
        where: {
          id: id,
        },
      },
    );
    await DoctorCertificate.update(
      {
        verification_status: approvelStatus,
      },
      {
        where: {
          id: id,
        },
      },
    );
    return res.status(200).json({ msg: "Doctor Approved Successfully" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: error.message,
    });
  }
};

module.exports = approveDoctor;
