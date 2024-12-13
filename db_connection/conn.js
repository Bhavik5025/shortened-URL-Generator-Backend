const mongoose = require("mongoose");

function handleError(error) {
    console.error("Database connection error:", error);
    process.exit(1); // Exit the process if the database connection fails
}

mongoose.connect("mongodb://localhost:27017/Assignment")
    .then(() => console.log("Database connected successfully"))
    .catch(error => handleError(error));
