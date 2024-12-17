const mongoose = require("mongoose");
require('dotenv').config();
function handleError(error) {
    console.error("Database connection error:", error);
    process.exit(1); // Exit the process if the database connection fails
}

mongoose.connect(process.env.DB_CONNECTION)
    .then(() => console.log("Database connected successfully"))
    .catch(error => handleError(error));
