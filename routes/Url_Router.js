const express = require("express");
const router = express.Router();
require("dotenv").config();

const { tokenVerify } = require("../middlewares");
const {
  URL_Creation,
  Success_Count,
  Failure_Count,
  Search_URL,
  Total_Count,
  URL_List,
  URL_Status,
  URL_Validation,
  URL_Operation,
} = require("../controllers/url");

// Route to create a shortened URL
router.post("/createShortendUrl", tokenVerify, URL_Creation);

//return successfull count
router.post("/success_count", tokenVerify, Success_Count);

//return failure count
router.post("/failure_count", tokenVerify, Failure_Count);

//improvised version of success and failure count
router.post("/totalcounts", tokenVerify, Total_Count);

//Search the Urls based on their friendly Name
router.post("/search", tokenVerify, Search_URL);
//list of shortendurls created by user in sorted order based on creation time
router.get("/shortendurls", tokenVerify, URL_List);

//when click on shortend_url then every request is store in database with creation time
router.get("/Url_statistics/:url_id", tokenVerify, URL_Status);

//url verification using secret key
router.get("/:shortId", URL_Validation);

// POST route for secret key verification
router.post("/:shortId", URL_Operation);

//

module.exports = router;
