require("dotenv").config();
const User = require("../models/User");
const moment=require("moment");
const logger=require("../logger")
const CryptoJS = require("crypto-js");
const jwt = require("jsonwebtoken");
const SECRET_KEY = process.env.SECRET_KEY;
const USER_SECRET_KEY = process.env.USER_SECRET_KEY;

async function User_Registration(req, res) {
  const { name, password } = req.body;

  if (!name || !password) {
    logger.warn(
      { time: moment().format("YYYY-MM-DD HH:mm:ss") },
      "Registration failed: Missing required fields"
    );
    return res.status(400).json({ error: "All fields are required" });
  }

  const encrypted_password = CryptoJS.AES.encrypt(
    password,
    USER_SECRET_KEY
  ).toString();

  try {
    const user = new User({ name, password: encrypted_password });
    await user.save();
    logger.info(
      { time: moment().format("YYYY-MM-DD HH:mm:ss"), userId: user._id },
      "New user registered successfully"
    );

    const token = jwt.sign({ id: user._id, name: user.name }, SECRET_KEY, {
      expiresIn: "24h",
    });

    logger.info(
      { time: moment().format("YYYY-MM-DD HH:mm:ss"), userId: user._id },
      "Token generated for registered user"
    );

    res.status(201).json({ message: "User saved successfully", user, token });
  } catch (error) {
    logger.error(
      { time: moment().format("YYYY-MM-DD HH:mm:ss"), error: error.message },
      "Error saving user"
    );
    res.status(500).json({ error: "Failed to Register User" });
  }
}

async function User_Login(req, res) {
  const { name, password } = req.body;

  // Validate required fields
  if (!name || !password) {
    logger.warn(
      { time: moment().format("YYYY-MM-DD HH:mm:ss") },
      "Login failed: Missing required fields"
    );
    return res.status(400).json({ error: "Name and password are required" });
  }

  try {
    // Find user by name in the database
    const user = await User.findOne({ name });

    if (!user) {
      logger.warn(
        { time: moment().format("YYYY-MM-DD HH:mm:ss"), name },
        "Login failed: User not found"
      );
      return res
        .status(401)
        .json({ error: "Invalid credentials or Please Login" });
    }

    // Decrypt the stored password
    const bytes = CryptoJS.AES.decrypt(user.password, USER_SECRET_KEY);
    const decryptedPassword = bytes.toString(CryptoJS.enc.Utf8);

    // Compare decrypted password with the entered password
    if (decryptedPassword !== password) {
      logger.warn(
        { time: moment().format("YYYY-MM-DD HH:mm:ss"), name },
        "Login failed: Incorrect password"
      );
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Generate a JWT token
    const token = jwt.sign(
      {
        id: user._id, // Include user ID or other relevant data in the token payload
        name: user.name,
      },
      SECRET_KEY,
      { expiresIn: "24h" } // Token valid for 24 hours
    );

    logger.info(
      { time: moment().format("YYYY-MM-DD HH:mm:ss"), userId: user._id, name },
      "Login successful: Token generated"
    );

    // Return success response with token
    res.status(200).json({
      message: "Login Successful",
      token,
    });
  } catch (error) {
    logger.error(
      { time: moment().format("YYYY-MM-DD HH:mm:ss"), error: error.message },
      "Login failed: An error occurred"
    );
    res.status(500).json({ error: "An error occurred while processing login" });
  }
}

module.exports = { User_Registration, User_Login };
