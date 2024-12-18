require("dotenv").config();
const Urls = require("../models/Urls");
const URL_Logs = require("../models/URL_Logs");
const axios = require("axios");
const shortid = require("shortid");
const UAParser = require("ua-parser-js");

async function URL_Creation(req, res) {
  // At this point, the token is verified, and user data is available in req.user
  try {
    const key = Math.floor(1000000000 + Math.random() * 9000000000);

    const shortUrl = process.env.BACKEND_CONNECTION + "/" + shortid.generate();

    if (req.body.secret_key_status == "true") {
      const url = new Urls({
        original_url: req.body.original_url,
        shortened_url: shortUrl,
        friendly_name: req.body.friendly_name,
        user_id: req.user.id,
        secret_key: key,
        expired: false,
      });
      await url.save();
      res.status(201).json({
        message: "Url saved Successfully",
        url,
      });
    } else {
      const url = new Urls({
        original_url: req.body.original_url,
        shortened_url: shortUrl,
        friendly_name: req.body.friendly_name,
        user_id: req.user.id,

        expired: false,
      });
      await url.save();
      res.status(201).json({
        message: "Url saved Successfully",
        url,
      });
    }
  } catch (error) {
    console.error("Error saving data:", error.message);
    res.status(500).json({ error: "Failed to Save Url" });
  }
}

async function Success_Count(req, res) {
  try {
    const { url_id } = req.body;
    if (!url_id) {
      return res.status(400).json({ message: "URL ID is required" });
    }

    const success = await URL_Logs.aggregate([
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
}

async function Failure_Count(req, res) {
  try {
    const { url_id } = req.body;

    if (!url_id) {
      return res.status(400).json({ message: "url_id is required" });
    }

    // Aggregation to get the count of failures
    const failure = await URL_Logs.aggregate([
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
}

async function Total_Count(req, res) {
  try {
    const successCount = await URL_Logs.countDocuments({
      url_id: req.body.url_id,
      status: "Success",
    });
    const failureCount = await URL_Logs.countDocuments({
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
}

//Search the Urls based on their friendly Name
async function Search_URL(req, res) {
  const search = await Urls.find({ friendly_name: req.body.friendly_name });
  if (search) {
    res.json({ message: search });
  } else {
    res.json({ message: "data not found" });
  }
}

async function URL_List(req, res) {
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
}
async function URL_Status(req, res) {
  try {
    const { url_id } = req.params; // Extract URL ID from request parameters

    if (!url_id) {
      return res.status(400).json({ message: "URL ID is required" });
    }

    // Find URLs based on the provided url_id
    const Url_statistics = await URL_Logs.find({ url_id: url_id });

    // If no URLs are found, return a 404 response
    if (Url_statistics.length === 0) {
      return res
        .status(404)
        .json({ message: "No URLs found for the provided ID" });
    }

    // Successfully found URLs, return the data
    res.status(200).json({ message: "List of URLs", urls: Url_statistics });
  } catch (error) {
    // Catch any errors and send a 500 status with a message
    console.error("Error fetching URL data:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

async function URL_Validation(req, res) {
  const shortId = req.params.shortId;
  const userAgent = req.headers["user-agent"] || "Unknown";
  const parser = new UAParser(userAgent);
  const result = parser.getResult();

  const deviceName =
    result.device && result.device.model
      ? result.device.model
      : result.os.name === "Windows"
      ? "Windows Device"
      : "Unknown Device";
  const browserName = result.browser.name || "Unknown Browser";

  try {
    // Find the URL by its short ID
    const shortenedUrl = await Urls.findOne({
      shortened_url: { $regex: shortId, $options: "i" },
    });

    if (!shortenedUrl) {
      return res.status(404).send("URL not found");
    }

    // If no secret_key exists, redirect directly to the original URL
    if (!shortenedUrl.secret_key) {
      const urlAdd = new URL_Logs({
        url_id: shortenedUrl._id,
        ipAddress: req.ip || req.headers["x-forwarded-for"] || "Unknown",
        Device_name: `${deviceName} (${browserName})`,
        count: 1,
        status: "Success",
      });
      await urlAdd.save();
      return res.redirect(shortenedUrl.original_url);
    }
    if (shortenedUrl.expired) {
      return res
        .status(410)
        .send("Sorry, the link is expired. Please create a new one.");
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
}
async function URL_Operation(req, res) {
  const shortId = req.params.shortId;
  const { secret_key } = req.body;
  const shortenedUrl = await Urls.findOne({
    shortened_url: { $regex: shortId, $options: "i" },
  });

  const userAgent = req.headers["user-agent"] || "Unknown";
  const parser = new UAParser(userAgent);
  const result = parser.getResult();

  const deviceName =
    result.device && result.device.model
      ? result.device.model
      : result.os.name === "Windows"
      ? "Windows Device"
      : "Unknown Device";
  const browserName = result.browser.name || "Unknown Browser";

  const ipAddress = req.ip || req.headers["x-forwarded-for"] || "Unknown";

  try {
    if (!shortenedUrl) {
      return res.status(404).json({ message: "URL not found" });
    }

    if (shortenedUrl.secret_key !== parseInt(secret_key)) {
      const urlAdd = new URL_Logs({
        url_id: shortenedUrl._id,
        ipAddress,
        Device_name: `${deviceName} (${browserName})`,
        count: 1,
        status: "Failure",
      });
      await urlAdd.save();

      return res.status(403).json({ message: "Invalid Secret Key" });
    }

    const urlAdd = new URL_Logs({
      url_id: shortenedUrl._id,
      count: 1,
      ipAddress,
      Device_name: `${deviceName} (${browserName})`,
      status: "Success",
    });
    await urlAdd.save();

    return res.status(200).json({ original_url: shortenedUrl.original_url });
  } catch (error) {
    console.error("Error verifying secret key:", error.message);
    const urlAdd = new URL_Logs({
      url_id: shortenedUrl?._id,
      count: 1,
      ipAddress,
      Device_name: `${deviceName} (${browserName})`,
      status: "Failure",
    });
    await urlAdd.save();

    return res.status(500).json({ message: "Internal Server Error" });
  }
}

module.exports = {
  URL_Creation,
  Success_Count,
  Failure_Count,
  Total_Count,
  Search_URL,
  URL_List,
  URL_Status,
  URL_Validation,
  URL_Operation,
};
