const express = require("express");
const cors = require("cors"); 
const app = express();
require("../db_connection/conn");
const User_Router = require("../routes/User_Router.js");
const Url_Router=require("../routes/Url_Router.js");
const port = process.env.PORT || 3000;
const moment = require('moment');
const Url = require('../models/Urls.js');
// Middleware to parse incoming JSON requests
app.use(express.json());

// Enable CORS for all routes
app.use(cors());

// Use the Router module
app.use(User_Router);
app.use(Url_Router);

// Set an interval to run the code every 30 seconds for checking shortened url
setInterval(async () => {
  
    const currentTime = moment(); // Get the current time
  
    // Find all URLs that are not expired yet
    const urls = await Url.find({ expired: { $exists: true, $ne: true } }); // Only find URLs where 'expired' is not set or is false
    
  
    // Check if any URL is older than 24 hours and mark it as expired
    for (const urlRecord of urls) {
      const createdAt = moment(urlRecord.createdAt);
      const hoursPassed = currentTime.diff(createdAt, 'hours');
     
  
      // If 24 hours have passed, mark the URL as expired
      if (hoursPassed >= 24) {
        try {
          // Update the expired field directly in the database
          const result = await Url.updateOne(
            { _id: urlRecord._id }, // Find the URL by its ID
            {
              $set: { expired: true } // Set the expired field to true
            },
            { upsert: true } // Ensures the field is added if it doesn't exist
          );
  
          // Log the result if the update was successful
          if (result.nModified > 0) {
            console.log(`URL with ID ${urlRecord._id} expired.`);
          } else {
            console.log(`No update needed for URL with ID ${urlRecord._id}.`);
          }
        } catch (error) {
          console.error(`Error updating URL with ID ${urlRecord._id}:`, error);
        }
      }
    }
  }, 30000); // Runs every 30 seconds (30,000 milliseconds)
  
// Starting the server and logging the port it listens on
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});



// Catch-all for any unexpected routes
app.use((req, res, next) => {
    res.status(404).send("Sorry, this route does not exist");
});
