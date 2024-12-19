const mongoose = require("mongoose");
require('dotenv').config();
const logger = require('../logger.js');

function handleError(error) {
    logger.error({ err: error }, "Database connection error");
    process.exit(1); // Exit the process if the database connection fails
}

mongoose.connect(process.env.DB_CONNECTION)
    .then(() => logger.info("Database connected successfully"))
    .catch(error => handleError(error));
    