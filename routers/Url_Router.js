const express = require("express");
const router = express.Router();
require('dotenv').config();
const jwt = require("jsonwebtoken");
const Urls = require("../models/Urls");
const Counts = require("../models/Counts");
const SECRET_KEY = process.env.SECRET_KEY;
const axios = require("axios");
const shortid = require("shortid");

// Middleware to verify the token
const tokenVerify = (req, res, next) => {
  // Get the token from the Authorization header
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Extract token (Bearer <token>)

  if (!token) {

    console.log( "Access denied. No token provided." );
    return res.redirect(process.env.FRONTEND_CONNECTION+"/authentication");
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
      return res.redirect(process.env.FRONTEND_CONNECTION+"/authentication");
    }
  }
};

// Route to create a shortened URL
router.post("/createShortendUrl", tokenVerify, async (req, res) => {
  // At this point, the token is verified, and user data is available in req.user
  try {
    const shortUrl = process.env.BACKEND_CONNECTION+"/" + shortid.generate();

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

//url click
// Import your Urls model

router.get("/:shortId",async (req, res) => {
  const shortId = req.params.shortId;
  const shoreterurl = await Urls.findOne({ shortened_url: { $regex: shortId, $options: "i" } });

  try {
    

    // Find the URL by its short ID
    
    if (!shoreterurl) {
      return res.status(404).send("URL not found");
    }

    // Redirect to the original URL
    const url = await axios.get(shoreterurl.original_url);
    if (url.status >= 200 && url.status < 300) {
      const urladd = new Counts({
        url_id: shoreterurl._id,

        count: 1,
        status: "Success",
      });
      await urladd.save();
     
    } else {
      const urladd = new Counts({
        url_id: shoreterurl._id,

        count: 1,
        status: "Failure",
      });
      await urladd.save();
    }
    return res.redirect(shoreterurl.original_url);
  } catch (error) {
    const urladd = new Counts({
      url_id: shoreterurl._id,

      count: 1,
      status: "Failure",
    });
    await urladd.save();
    console.error("Error during redirection:", error.message);
    res.status(500).send("Internal Server Error");
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
  try {
    const { url_id } = req.body;
    if (!url_id) {
      return res.status(400).json({ message: "URL ID is required" });
    }

    const success = await Counts.aggregate([
      { $match: { url_id, status: "Success" } },
      { $group: { _id: "$url_id", totalsuccess: { $sum: 1 } } },
    ]);

    const totalSuccess = success.length > 0 ? success[0].totalsuccess : 0;

    res.status(200).json({
      message: "Total successful clicks",
      success: totalSuccess,
    });
  } catch (error) {
    console.error("Error in /success_count:", error);
    res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
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


//return failure count
router.post("/failure_count", tokenVerify, async (req, res) => {
  try {
    const { url_id } = req.body;

    if (!url_id) {
      return res.status(400).json({ message: "url_id is required" });
    }

    // Aggregation to get the count of failures
    const failure = await Counts.aggregate([
      { 
        $match: { 
          url_id: url_id, 
          status: "Failure" 
        } 
      }, 
      { 
        $group: { 
          _id: "$url_id", 
          totalfailure: { $sum: 1 } 
        } 
      }
    ]);

    if (failure.length === 0) {
      return res.status(200).json({
        message: "Total Failure clicks",
        success: 0, // Return 0 if no failures are found
      });
    }

    // Return the failure count
    res.status(200).json({
      message: "Total Failure clicks",
      success: failure[0].totalfailure,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

//improvised version of success and failure count
router.post("/totalcounts", tokenVerify, async (req, res) => {
  try {
    const successCount = await Counts.countDocuments({ url_id: req.body.url_id, status: "Success" });
    const failureCount = await Counts.countDocuments({ url_id: req.body.url_id, status: "Failure" });

    return res.status(200).json({
      message: "Total counts",
      Success: successCount,
      Failure: failureCount,
    });
  } catch (error) {
    console.error("Error in /totalcounts:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
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
