const mongoose = require("mongoose");

function handleError(error) {
    console.error("Database connection error:", error);
    process.exit(1); // Exit the process if the database connection fails
}

mongoose.connect("mongodb+srv://bhavik:Svsm4142@bhavikprojects.tix8r.mongodb.net/Assignment")
    .then(() => console.log("Database connected successfully"))
    .catch(error => handleError(error));
