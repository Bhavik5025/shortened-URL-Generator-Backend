require("dotenv").config();
const Urls = require("../models/Urls");
const URL_Logs = require("../models/URL_Logs");
const axios = require("axios");
const UAParser = require("ua-parser-js");
const moment = require("moment");
const logger = require("../logger");
const shortid = require("shortid");

async function URL_Creation(req, res) {
  try {
    const { original_url, friendly_name, secret_key_status, expire_time } =
      req.body;
    logger.info(
      { time: moment().format("YYYY-MM-DD HH:mm:ss") },
      "Received URL creation request"
    );

    // Validate required fields
    if (!original_url) {
      logger.warn(
        { time: moment().format("YYYY-MM-DD HH:mm:ss") },
        "URL creation failed: Original URL is missing"
      );
      return res.status(400).json({ error: "Original URL is required" });
    }

    // Generate secret key if enabled
    const key =
      secret_key_status === "true" || secret_key_status === true
        ? Math.floor(1000000000 + Math.random() * 9000000000)
        : null;

    if (key) {
      logger.info(
        { time: moment().format("YYYY-MM-DD HH:mm:ss"), key },
        "Generated secret key"
      );
    }

    // Generate shortened URL
    const shortUrl = `${process.env.BACKEND_CONNECTION}/${shortid.generate()}`;
    logger.info(
      { time: moment().format("YYYY-MM-DD HH:mm:ss"), shortUrl },
      "Generated shortened URL"
    );

    // Prepare URL data
    const urlData = {
      original_url,
      shortened_url: shortUrl,
      friendly_name,
      user_id: req.user.id,
    };

    if (key) {
      urlData.secret_key = key;
    }
    if (expire_time) {
      urlData.expire_time = new Date(expire_time);
      logger.info(
        { time: moment().format("YYYY-MM-DD HH:mm:ss"), expire_time },
        "Added expiry time to URL data"
      );
    }

    // Save URL document
    const url = new Urls(urlData);
    await url.save();

    logger.info(
      { time: moment().format("YYYY-MM-DD HH:mm:ss"), urlId: url._id },
      "URL saved successfully"
    );

    // Send response
    res.status(201).json({
      message: "URL saved successfully",
      url,
    });
  } catch (error) {
    logger.error(
      { time: moment().format("YYYY-MM-DD HH:mm:ss"), error: error.message },
      "Error during URL creation"
    );
    res.status(500).json({ error: "Failed to save URL" });
  }
}

async function Total_Count(req, res) {
  try {
    logger.info(
      { time: moment().format("YYYY-MM-DD HH:mm:ss"), urlId: req.body.url_id },
      "Received request for total counts"
    );

    // Count success logs
    const successCount = await URL_Logs.countDocuments({
      url_id: req.body.url_id,
      status: "true",
    });
    logger.info(
      { time: moment().format("YYYY-MM-DD HH:mm:ss"), successCount },
      "Success count calculated"
    );

    // Count failure logs
    const failureCount = await URL_Logs.countDocuments({
      url_id: req.body.url_id,
      status: "false",
    });
    logger.info(
      { time: moment().format("YYYY-MM-DD HH:mm:ss"), failureCount },
      "Failure count calculated"
    );

    // Send response
    logger.info(
      { time: moment().format("YYYY-MM-DD HH:mm:ss"), urlId: req.body.url_id },
      "Successfully retrieved total counts"
    );
    return res.status(200).json({
      message: "Total counts",
      Success: successCount,
      Failure: failureCount,
    });
  } catch (error) {
    logger.error(
      { time: moment().format("YYYY-MM-DD HH:mm:ss"), error: error.message },
      "Error occurred in /totalcounts"
    );
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
}

//Search the Urls based on their friendly Name
async function Search_URL(req, res) {
  try {
    const { friendly_name } = req.body;

    // Log request start
    logger.info(
      { time: moment().format("YYYY-MM-DD HH:mm:ss"), friendly_name },
      "Search request initiated"
    );

    // Search for the URL
    const search = await Urls.find({ friendly_name });

    if (search && search.length > 0) {
      logger.info(
        { time: moment().format("YYYY-MM-DD HH:mm:ss"), friendly_name },
        "Search result found"
      );
      return res.status(200).json({ message: search });
    } else {
      logger.warn(
        { time: moment().format("YYYY-MM-DD HH:mm:ss"), friendly_name },
        "No data found for the given friendly name"
      );
      return res.status(404).json({ message: "Data not found" });
    }
  } catch (error) {
    logger.error(
      { time: moment().format("YYYY-MM-DD HH:mm:ss"), error: error.message },
      "Error occurred during search"
    );
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
}

async function URL_List(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    logger.info({ user: req.user.id, page, limit }, "Fetching URL list");

    const data = await Urls.find({ user_id: req.user.id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    const totalCount = await Urls.countDocuments({ user_id: req.user.id });

    if (data.length > 0) {
      logger.info(
        { user: req.user.id, totalCount },
        "URLs retrieved successfully"
      );
      res.json({
        message: data,
        pagination: {
          page,
          limit,
          totalPages: Math.ceil(totalCount / limit),
          totalCount,
        },
      });
    } else {
      logger.warn({ user: req.user.id }, "No URLs found for the user");
      res.status(404).json({ message: "No URLs found for this user" });
    }
  } catch (error) {
    logger.error(
      { user: req.user.id, error: error.message },
      "Error fetching URLs"
    );
    res.status(500).json({ message: "Internal Server Error" });
  }
}

async function URL_Status(req, res) {
  try {
    const { url_id } = req.params;

    if (!url_id) {
      logger.warn("URL ID is required but not provided");
      return res.status(400).json({ message: "URL ID is required" });
    }

    logger.info({ url_id }, "Fetching URL status");
    const Url_statistics = await URL_Logs.aggregate([
      { $match: { url_id: url_id } },
      {
        $group: {
          _id: "$ipAddress",
          firstCreatedAt: { $min: "$createdAt" },
          lastCreatedAt: { $max: "$createdAt" },
          firstDeviceName: { $first: "$Device_name" },
          lastDeviceName: { $last: "$Device_name" },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          ipAddress: "$_id",
          firstCreatedAt: 1,
          lastCreatedAt: 1,
          firstDeviceName: 1,
          lastDeviceName: 1,
          count: 1,
          _id: 0,
        },
      },
    ]);

    if (Url_statistics.length === 0) {
      logger.warn({ url_id }, "No data found for the provided URL ID");
      return res
        .status(404)
        .json({ message: "No URLs found for the provided ID" });
    }

    logger.info({ url_id }, "URL statistics retrieved successfully");
    res.status(200).json({ message: "List of URLs", urls: Url_statistics });
  } catch (error) {
    logger.error({ url_id, error: error.message }, "Error fetching URL status");
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

  logger.info({ shortId, userAgent }, "Starting URL validation");

  try {
    // Find the URL by its short ID
    const shortenedUrl = await Urls.findOne({
      shortened_url: { $regex: shortId, $options: "i" },
    });

    if (!shortenedUrl) {
      logger.warn({ shortId }, "Shortened URL not found");
      return res.status(404).send("URL not found");
    }

    logger.info({ shortId }, "Shortened URL found");

    // If no secret_key exists, redirect directly to the original URL
    if (
      !shortenedUrl.secret_key &&
      !shortenedUrl.expire_time &&
      !shortenedUrl.expired
    ) {
      const urlAdd = new URL_Logs({
        url_id: shortenedUrl._id,
        ipAddress: req.ip || req.headers["x-forwarded-for"] || "Unknown",
        Device_name: `${deviceName} (${browserName})`,
        status: true,
      });
      await urlAdd.save();

      logger.info(
        { shortId, original_url: shortenedUrl.original_url },
        "Redirecting to original URL without secret key"
      );
      return res.redirect(shortenedUrl.original_url);
    }

    const currentTime = new Date();
    if (
      shortenedUrl.expired == true ||
      new Date(shortenedUrl.expire_time) < currentTime
    ) {
      logger.info({ shortId }, "URL is expired");
      return res
        .status(410)
        .send("Sorry, the link is expired. Please create a new one.");
    }

    logger.info({ shortId }, "URL is valid, rendering secret key page");

    // send html page for collect secret key
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
    logger.error(
      { shortId, error: error.message },
      "Error during URL validation"
    );
    res.status(500).send("Internal Server Error");
  }
}
async function URL_Operation(req, res) {
  const shortId = req.params.shortId;
  const { secret_key } = req.body;

  // Log incoming request details
  logger.info(`Incoming request for shortId: ${shortId} from IP: ${req.ip}`);

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
      logger.warn(`URL not found for shortId: ${shortId}`);
      return res.status(404).json({ message: "URL not found" });
    }

    if (shortenedUrl.secret_key !== parseInt(secret_key)) {
      // Log the invalid secret key attempt
      logger.warn(
        `Invalid secret key for shortId: ${shortId} from IP: ${ipAddress}`
      );

      const urlAdd = new URL_Logs({
        url_id: shortenedUrl._id,
        ipAddress,
        Device_name: `${deviceName} (${browserName})`,
        status: false,
      });
      await urlAdd.save();

      return res.status(403).json({ message: "Invalid Secret Key" });
    }

    // Log successful request
    logger.info(`Valid request for shortId: ${shortId} from IP: ${ipAddress}`);

    const urlAdd = new URL_Logs({
      url_id: shortenedUrl._id,
      ipAddress,
      Device_name: `${deviceName} (${browserName})`,
      status: true,
    });
    await urlAdd.save();

    return res.status(200).json({ original_url: shortenedUrl.original_url });
  } catch (error) {
    // Log the error
    logger.error(
      `Error verifying secret key for shortId: ${shortId}: ${error.message}`
    );

    const urlAdd = new URL_Logs({
      url_id: shortenedUrl?._id,
      ipAddress,
      Device_name: `${deviceName} (${browserName})`,
      status: false,
    });
    await urlAdd.save();

    return res.status(500).json({ message: "Internal Server Error" });
  }
}
async function URL_Expire_Update(req, res) {
  try {
    const { url_id } = req.body;

    // Log the incoming request
    logger.info(`Incoming request to expire URL with ID: ${url_id}`);

    // Validate input
    if (!url_id) {
      logger.warn("URL ID is missing in the request body.");
      return res.status(400).json({ error: "URL ID is required" });
    }

    // Prepare update data
    const updateData = {};

    // Update the URL in the database
    const result = await Urls.updateOne(
      { _id: url_id }, // Match by URL ID
      { $set: { expired: true } }, // Set new data
      { upsert: false }
    );

    // Check if the update was successful
    if (result.matchedCount === 0) {
      logger.warn(`URL with ID: ${url_id} not found for expiration.`);
      return res.status(404).json({ error: "URL not found" });
    }

    // Log success
    logger.info(`URL with ID: ${url_id} expired successfully.`);

    res.status(200).json({
      message: "URL expiration status updated successfully",
      result,
    });
  } catch (error) {
    // Log the error
    logger.error(
      `Error updating URL expiration for ID: ${url_id} - ${error.message}`
    );

    res.status(500).json({ error: "Failed to update URL expiration" });
  }
}

module.exports = {
  URL_Creation,
  URL_Expire_Update,
  Total_Count,
  Search_URL,
  URL_List,
  URL_Status,
  URL_Validation,
  URL_Operation,
};
