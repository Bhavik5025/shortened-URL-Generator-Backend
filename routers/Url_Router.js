const express = require("express");
const User = require("../models/Urls");
const router = express.Router();
const jwt = require("jsonwebtoken");
const Urls = require("../models/Urls");
const Counts = require("../models/Counts");
const SECRET_KEY = "bhavik123";
const axios = require("axios");
const shortid = require("shortid");

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

// Route to create a shortened URL
router.post("/createShortendUrl", tokenVerify, async (req, res) => {
  // At this point, the token is verified, and user data is available in req.user
  try {
    const shortUrl = "MyShortendURl/" + shortid.generate();

    const url = new Urls({
      original_url: req.body.original_url,
      shortened_url: shortUrl,
      friendly_name: req.body.friendly_name,
      user_id: req.user.id,
    });
    await url.save();
    res.status(201).json({
      message: "Url saved Successfully",
      url,
    });
  } catch (error) {
    console.error("Error saving data:", error.message);
    res.status(500).json({ error: "Failed to Save Url" });
  }
});
//when click on shortend_url then every request is store in database with creation time
router.post("/Url_status", tokenVerify, async (req, res) => {
  try {
    const url = await axios.get(req.body.url);
    if (url.status >= 200 && url.status < 300) {
      const urladd = new Counts({
        url_id: req.body.url_id,

        count: 1,
        status: "Success",
      });
      await urladd.save();
      res.json({ message: "Success" });
    } else {
      const urladd = new Counts({
        url_id: req.body.url_id,

        count: 1,
        status: "Failure",
      });
      await urladd.save();
      res.json({ message: "Failure" });
    }
  } catch (error) {
    const urladd = new Counts({
      url_id: req.body.url_id,

      count: 1,
      status: "Failure",
    });
    await urladd.save();
    res.json({ message: "Failure" });
  }
});
//return successfull count
router.post("/success_count", tokenVerify, async (req, res) => {
  const counts = await Counts.find({ url_id: req.body.url_id });
  const success = await Counts.aggregate([
    { $match: { url_id: req.body.url_id, status: "Success" } }, // Match documents by url_id and status
    { $group: { _id: "$url_id", totalsuccess: { $sum: 1 } } }, // Group by url_id and count the number of successful entries
  ]);

  res
    .status(200)
    .json({
      message: "Total successful clicks",
      success: success[0].totalsuccess,
    });
});
//return failure count
router.post("/failure_count", tokenVerify, async (req, res) => {
  const counts = await Counts.find({ url_id: req.body.url_id });
  const failure = await Counts.aggregate([
    { $match: { url_id: req.body.url_id, status: "Failure" } }, // Match documents by url_id and status
    { $group: { _id: "$url_id", totalfailure: { $sum: 1 } } }, // Group by url_id and count the number of successful entries
  ]);

  if (failure.length === 0) {
    return res.status(404).json({ message: "No fail clicks found" });
  }
  res
    .status(200)
    .json({
      message: "Total Failure clicks",
      success: failure[0].totalfailure,
    });
});

//list of shortendurls created by user in sorted order based on creation time
router.post("/shortendurls", tokenVerify, async (req, res) => {
  const data = await Urls.find({ user_id: req.user.id }).sort({
    created_at: -1,
  });
  if (data) {
    res.json({ message: data });
  } else {
    res.json({ message: "error" });
  }
});

//Search the Urls based on their friendly Name
router.post("/search", tokenVerify, async (req, res) => {
  const search = await Urls.find({ friendly_name: req.body.friendly_name });
  if (search) {
    res.json({ message: search });
  } else {
    res.json({ message: "data not found" });
  }
});
module.exports = router;
