const express = require("express");
const cors = require("cors");
const app = express();
require("../db_connection/conn");
const User_Router = require("../routes/User_Router.js");
const Url_Router = require("../routes/Url_Router.js");
const port = process.env.PORT || 3000;
const moment = require("moment");
const Url = require("../models/Urls.js");
const logger = require('../logger.js'); 
// Middleware to parse incoming JSON requests
app.use(express.json());

// Enable CORS for all routes
app.use(cors());

// Use the Router module
app.use(User_Router);
app.use(Url_Router);

// Set an interval to run the code every 20 seconds for checking shortened url
// setInterval(async () => {
//   const currentTime = moment(); // Get the current time

//   try {
//     // Update all URLs where createdAt is older than 24 hours and expired is not set or false
//     const result = await Url.updateMany(
//       {
//         createdAt: { $lt: currentTime.subtract(24, "hours").toDate() }, // Find documents older than 24 hours
//         expired: { $exists: false },
//       },
//       {
//         $set: { expired: true }, // Set the expired field to true
//       }
//     );

//     if (result.modifiedCount > 0) {
//       logger.info(`${result.modifiedCount} URLs marked as expired.`);
//     } else {
//       logger.info("No URLs need to be updated.");
//     }
//   } catch (error) {
//     logger.error({ err: error }, "Error updating expired URLs");
//   }
// }, 20000); // Runs every 20 seconds
// // Starting the server and logging the port it listens on
app.listen(port, () => {
  logger.info({time: moment().format('YYYY-MM-DD HH:mm:ss')},`Server is running on port ${port}`);
});

// Catch-all for any unexpected routes
app.use((req, res, next) => {
  res.status(404).send("Sorry, this route does not exist");
});
