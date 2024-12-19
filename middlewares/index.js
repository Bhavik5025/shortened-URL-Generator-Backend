const User = require("../models/User");
require("dotenv").config();

const moment = require("moment");

const logger = require("../logger"); // Import your Bunyan logger

const SECRET_KEY = process.env.SECRET_KEY;
const USER_SECRET_KEY = process.env.USER_SECRET_KEY;

const jwt = require("jsonwebtoken");
const CryptoJS = require("crypto-js");

// Middleware to verify the token
const tokenVerify = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Extract token (Bearer <token>)

  if (!token) {
    logger.warn(
      { time: moment().format("YYYY-MM-DD HH:mm:ss") },
      "Access denied. No token provided."
    );
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  try {
    const decoded = jwt.verify(token, SECRET_KEY); // Verify the token
    req.user = decoded; // Attach the decoded user data to the request

    logger.info(
      { user: decoded.id, time: moment().format("YYYY-MM-DD HH:mm:ss") },
      "Token verified successfully"
    );
    next(); // Proceed if token is valid
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      logger.warn("Token expired for request", {
        error,
        time: moment().format("YYYY-MM-DD HH:mm:ss"),
      });
      return res
        .status(401)
        .json({ error: "Token has expired. Please login again." });
    } else {
      logger.error(
        { error, time: moment().format("YYYY-MM-DD HH:mm:ss") },
        "Invalid token"
      );
      return res.status(403).json({ error: "Invalid token." });
    }
  }
};

// Middleware to check if a user exists in the database
const checkUserExists = async (req, res, next) => {
  const { name, password } = req.body;

  // Validate input
  if (!name || !password) {
    logger.warn(
      { time: moment().format("YYYY-MM-DD HH:mm:ss") },
      "Missing name or password in request body"
    );
    return res.status(400).json({ error: "Name and password are required" });
  }

  try {
    const existingUser = await User.findOne({ name }); // Find user by name

    if (existingUser) {
      // Decrypt the stored password
      const bytes = CryptoJS.AES.decrypt(
        existingUser.password,
        USER_SECRET_KEY
      );
      const decryptedPassword = bytes.toString(CryptoJS.enc.Utf8);

      if (decryptedPassword === password) {
        logger.info(
          {
            user: existingUser.id,
            time: moment().format("YYYY-MM-DD HH:mm:ss"),
          },
          "User authenticated successfully.User with the same name and password exists in the database"
        );
        return res.status(200).json({
          message:
            "User with the same name and password exists in the database",
          user: existingUser,
        });
      } else {
        logger.warn("Invalid password attempt", {
          user: name,
          time: moment().format("YYYY-MM-DD HH:mm:ss"),
        });
        return res.status(401).json({ error: "Invalid password" });
      }
    }

    logger.info("User not found in database, proceeding to next step", {
      name,
      time: moment().format("YYYY-MM-DD HH:mm:ss"),
    });
    next(); // User not found, proceed to next step
  } catch (error) {
    logger.error({ error }, "Error checking user existence");
    res
      .status(500)
      .json({ error: "An error occurred while checking user existence" });
  }
};

module.exports = { tokenVerify, checkUserExists };
