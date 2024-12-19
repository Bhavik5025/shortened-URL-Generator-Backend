const mongoose = require("mongoose");
require('dotenv').config();
const moment=require('moment')
const logger = require('../logger.js');

function handleError(error) {
    logger.error({ err: error,time: moment().format('YYYY-MM-DD HH:mm:ss') }, "Database connection error");
    process.exit(1); // Exit the process if the database connection fails
}

mongoose.connect(process.env.DB_CONNECTION)
    .then(() => logger.info({time: moment().format('YYYY-MM-DD HH:mm:ss')},"Database connected successfully"))
    .catch(error => handleError(error));
    