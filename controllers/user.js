require("dotenv").config();
const User = require("../models/User");

const CryptoJS = require("crypto-js");
const jwt = require("jsonwebtoken");
const SECRET_KEY = process.env.SECRET_KEY;
const USER_SECRET_KEY = process.env.USER_SECRET_KEY;
async function User_Registration(req, res) {
  const { name, password } = req.body;

  // Validate required fields
  if (!name || !password) {
    return res.status(400).json({ error: "All fields are required" });
  }
  //apply encryption
  const encrypted_pasword = CryptoJS.AES.encrypt(
    password,
    USER_SECRET_KEY
  ).toString();

  try {
    // Save new user to the database
    const user = new User({
      name,
      password: encrypted_pasword,
    });

    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user._id, // Include user ID or other relevant data in the token payload
        name: user.name,
      },
      SECRET_KEY,
      { expiresIn: "24h" } // Token expires in 24 hours
    );

    // Send success response with token
    res.status(201).json({
      message: "User saved successfully",
      user,
      token,
    });
  } catch (error) {
    console.error("Error saving data:", error.message);
    res.status(500).json({ error: "Failed to Register User" });
  }
}

async function User_Login(req, res) {
  const { name, password } = req.body;

  // Validate required fields
  if (!name || !password) {
    return res.status(400).json({ error: "Name and password are required" });
  }

  try {
    // Find user by name in the database
    const user = await User.findOne({ name });

    if (!user) {
      return res
        .status(401)
        .json({ error: "Invalid credentials or Please Login" });
    }

    // Decrypt the stored password
    const bytes = CryptoJS.AES.decrypt(user.password, USER_SECRET_KEY);
    const decryptedPassword = bytes.toString(CryptoJS.enc.Utf8);

    // Compare decrypted password with the entered password
    if (decryptedPassword !== password) {
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

    // Return success response with token
    res.status(200).json({
      message: "Login Successful",
      token,
    });
  } catch (error) {
    console.error("Error during login:", error.message);
    res.status(500).json({ error: "An error occurred while processing login" });
  }
}

module.exports = { User_Registration, User_Login };
