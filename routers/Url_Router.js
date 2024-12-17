const express = require("express");
const router = express.Router();
require("dotenv").config();
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
    const key=Math.floor(1000000000 + Math.random() * 9000000000);

    const shortUrl = process.env.BACKEND_CONNECTION + "/" + shortid.generate();

    const url = new Urls({
      original_url: req.body.original_url,
      shortened_url: shortUrl,
      friendly_name: req.body.friendly_name,
      user_id: req.user.id,
      secret_key:key
      
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

// router.get("/:shortId",async (req, res) => {
//   const shortId = req.params.shortId;
//   const shoreterurl = await Urls.findOne({ shortened_url: { $regex: shortId, $options: "i" } });

//   try {

//     // Find the URL by its short ID

//     if (!shoreterurl) {
//       return res.status(404).send("URL not found");
//     }

//     // Redirect to the original URL
//     const url = await axios.get(shoreterurl.original_url);
//     if (url.status >= 200 && url.status < 300) {
//       const urladd = new Counts({
//         url_id: shoreterurl._id,

//         count: 1,
//         status: "Success",
//       });
//       await urladd.save();

//     } else {
//       const urladd = new Counts({
//         url_id: shoreterurl._id,

//         count: 1,
//         status: "Failure",
//       });
//       await urladd.save();
//     }
//     return res.redirect(shoreterurl.original_url);
//   } catch (error) {
//     const urladd = new Counts({
//       url_id: shoreterurl._id,

//       count: 1,
//       status: "Failure",
//     });
//     await urladd.save();
//     console.error("Error during redirection:", error.message);
//     res.status(500).send("Internal Server Error");
//   }
// });

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
          status: "Failure",
        },
      },
      {
        $group: {
          _id: "$url_id",
          totalfailure: { $sum: 1 },
        },
      },
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
    const successCount = await Counts.countDocuments({
      url_id: req.body.url_id,
      status: "Success",
    });
    const failureCount = await Counts.countDocuments({
      url_id: req.body.url_id,
      status: "Failure",
    });

    return res.status(200).json({
      message: "Total counts",
      Success: successCount,
      Failure: failureCount,
    });
  } catch (error) {
    console.error("Error in /totalcounts:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
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
//list of shortendurls created by user in sorted order based on creation time
router.post("/shortendurls", tokenVerify, async (req, res) => {
  try {
    // Find URLs for the authenticated user and sort by created_at descending
    const data = await Urls.find({ user_id: req.user.id }).sort({
      created_at: -1,
    });

    if (data.length > 0) {
      // If data exists, return it
      res.json({ message: data });
    } else {
      // If no data is found, return an appropriate response
      res.status(404).json({ message: "No URLs found for this user" });
    }
  } catch (error) {
    // Handle any potential errors
    console.error("Error fetching URLs:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
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

router.get("/:shortId", async (req, res) => {
  const shortId = req.params.shortId;

  try {
    // Find the URL by its short ID
    const shortenedUrl = await Urls.findOne({
      shortened_url: { $regex: shortId, $options: "i" },
    });

    if (!shortenedUrl) {
      return res.status(404).send("URL not found");
    }

    // Send a simple HTML page to collect the secret key
    return res.send(`
     <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Enter Secret Key</title>
          <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body class="bg-gray-100 flex items-center justify-center h-screen">
      
          <div class="w-full max-w-md px-6 py-8 bg-white shadow-lg rounded-lg">
            <h1 class="text-2xl font-semibold text-center text-gray-700 mb-6">
              Enter Secret Key
            </h1>
           
            <form id="secretForm" class="flex flex-col space-y-4">
             
              <input
                type="password"
                id="secretKey"
                name="secretKey"
                placeholder="Enter Secret Key"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none"
                required
              />
            
              <button
                type="submit"
                class="w-full bg-red-500 text-white py-2 rounded-lg font-semibold hover:bg-red-600 transition duration-300"
              >
                Submit
              </button>
            </form>
          </div>
          <script>
            document.getElementById("secretForm").onsubmit = async (e) => {
              e.preventDefault();
              const secretKey = document.getElementById("secretKey").value;

              try {
                // Send the secret key to the backend for verification
                const response = await fetch(window.location.pathname, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ secret_key: secretKey }),
                });

                if (response.ok) {
                  const { original_url } = await response.json();
                  window.location.href = original_url; // Redirect to the original URL
                } else {
                  alert("Invalid Secret Key. Access Denied.");
                }
              } catch (error) {
                console.error("Error:", error.message);
                alert("Something went wrong. Please try again.");
              }
            };
          </script>
        </body>
      </html>

    `);
  } catch (error) {
    console.error("Error during redirection:", error.message);
    res.status(500).send("Internal Server Error");
  }
});

// POST route for secret key verification
router.post("/:shortId", async (req, res) => {
  const shortId = req.params.shortId;
  const { secret_key } = req.body;

  try {
    // Find the URL by its short ID
    const shortenedUrl = await Urls.findOne({
      shortened_url: { $regex: shortId, $options: "i" },
    });

    if (!shortenedUrl) {
      return res.status(404).json({ message: "URL not found" });
    }

    // Validate the secret key
    if (shortenedUrl.secret_key !== parseInt(secret_key)) {
      const urlAdd = new Counts({
        url_id: shortenedUrl?._id,
        count: 1,
        status: "Failure",
      });
      await urlAdd.save();
      return res.status(403).json({ message: "Invalid Secret Key" });

    }

    // Save a successful request in the database
    const urlAdd = new Counts({
      url_id: shortenedUrl._id,
      count: 1,
      status: "Success",
    });
    await urlAdd.save();

    // Send the original URL back to the client
    return res.status(200).json({ original_url: shortenedUrl.original_url });
  } catch (error) {
    console.error("Error verifying secret key:", error.message);
    const urlAdd = new Counts({
      url_id: shortenedUrl?._id,
      count: 1,
      status: "Failure",
    });
    await urlAdd.save();
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

module.exports = router;
