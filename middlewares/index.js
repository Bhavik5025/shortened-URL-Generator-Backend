const User = require("../models/User");
require("dotenv").config();

const SECRET_KEY = process.env.SECRET_KEY;

const USER_SECRET_KEY = process.env.USER_SECRET_KEY;

const jwt = require("jsonwebtoken");
const CryptoJS = require("crypto-js");

// Middleware to verify the token
const tokenVerify = (req, res, next) => {
  // Get the token from the Authorization header
  const authHeader = req.headers["authorization"];

  const token = authHeader && authHeader.split(" ")[1]; // Extract token (Bearer <token>)

  if (!token) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  try {
    // Verify the token using the SECRET_KEY
    const decoded = jwt.verify(token, SECRET_KEY);

    // Attach the decoded user data to the request object for further use
    req.user = decoded;

    // Proceed if token is valid
    next();
  } catch (error) {
    // Handle token expiration or invalid token error
    if (error.name === "TokenExpiredError") {
      return res
        .status(401)
        .json({ error: "Token has expired. Please login again." });
    } else {
      return res.status(403).json({ error: "Invalid token." });
    }
  }
};

const checkUserExists = async (req, res, next) => {
  const { name, password } = req.body;

  // Validate input
  if (!name || !password) {
    return res.status(400).json({ error: "Name and password are required" });
  }

  try {
    // Find user by name in the database
    const existingUser = await User.findOne({ name });

    if (existingUser) {
      // Decrypt the stored password
      const bytes = CryptoJS.AES.decrypt(
        existingUser.password,
        USER_SECRET_KEY
      );
      const decryptedPassword = bytes.toString(CryptoJS.enc.Utf8);

      // Compare the decrypted password with the entered password
      if (decryptedPassword === password) {
        return res.status(200).json({
          message:
            "User with the same name and password exists in the database",
          user: existingUser,
        });
      } else {
        return res.status(401).json({ error: "Invalid password" });
      }
    }

    // User not found, proceed to the next step
    next();
  } catch (error) {
    console.error("Error checking user existence:", error.message);
    res
      .status(500)
      .json({ error: "An error occurred while checking user existence" });
  }
};
module.exports = { tokenVerify, checkUserExists };
