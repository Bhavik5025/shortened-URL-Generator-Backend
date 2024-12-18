const express = require("express");
require('dotenv').config();
const User = require("../models/User");
const router = express.Router();
const jwt = require("jsonwebtoken");
const SECRET_KEY = process.env.SECRET_KEY;
const USER_SECRET_KEY=process.env.USER_SECRET_KEY;
const {checkUserExists}=require("../middlewares")
const {User_Registration,User_Login}=require("../controllers/user");


//User Registration
//first it check user is exist in database or not using checkUserExists Middleware .if it is not exist then new user data store in database.

router.post("/Register", checkUserExists,User_Registration);
router.post("/Login", User_Login);

module.exports = router;
