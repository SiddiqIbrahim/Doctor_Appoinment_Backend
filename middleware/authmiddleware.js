const jwt = require("jsonwebtoken");
require("dotenv").config();
const auth = (req, res, next) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    if (!token) {
      return res.status(400).json({ msg: "UnAuthticate" });
    }
    const decode = jwt.verify(token, process.env.SECRET_KEY);
    // console.log("decode", decode);
    req.user = decode.id;
    next();
  } catch (error) {
    res.status(500).json({ error: "Internal servre error" });
  }
};

module.exports = auth;
