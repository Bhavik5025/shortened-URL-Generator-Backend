const express = require("express");
const cors = require("cors"); 
const app = express();
require("../db_connection/conn");
const User_Router = require("../routes/User_Router.js");
const Url_Router=require("../routes/Url_Router.js");
const port = process.env.PORT || 3000;

// Middleware to parse incoming JSON requests
app.use(express.json());

// Enable CORS for all routes
app.use(cors());

// Use the Router module
app.use(User_Router);
app.use(Url_Router);

// Starting the server and logging the port it listens on
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

// Catch-all for any unexpected routes
app.use((req, res, next) => {
    res.status(404).send("Sorry, this route does not exist");
});
