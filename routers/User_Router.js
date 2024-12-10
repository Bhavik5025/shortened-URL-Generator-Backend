const express = require("express");
const User = require("../models/User");
const router = express.Router();
const jwt = require("jsonwebtoken");
const SECRET_KEY = "bhavik123";

const checkUserExists = async (req, res, next) => {
  const { name, password } = req.body;

  // Validate input
  if (!name || !password) {
    return res.status(400).json({ error: "Name and password are required" });
  }

  try {
    // Check if a user with the same name and password exists
    const existingUser = await User.findOne({ name, password });

    if (existingUser) {
      // User found
      return res.status(200).json({
        message: "User with the same name and password exists in the database",
        user: existingUser,
      });
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

//User Registration
//first it check user is exist in database or not using checkUserExists Middleware .if it is not exist then new user data store in database.

router.post("/Register", checkUserExists, async (req, res) => {
  const { name, password } = req.body;

  // Validate required fields
  if (!name || !password) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    // Save new user to the database
    const user = new User({
      name,
      password,
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
});

router.post("/Login", async (req, res) => {
    const { name, password } = req.body;
  
    // Validate required fields
    if (!name || !password) {
      return res.status(400).json({ error: "Name and password are required" });
    }
  
    try {
      // Find user in the database
      const user = await User.findOne({ name, password });
  
      if (user) {
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
      } else {
        // User not found or credentials are invalid
        res.status(401).json({ error: "Invalid credentials" });
      }
    } catch (error) {
      console.error("Error during login:", error.message);
      res.status(500).json({ error: "An error occurred while processing login" });
    }
  });

module.exports = router;
