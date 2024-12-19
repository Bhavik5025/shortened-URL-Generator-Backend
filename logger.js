const bunyan = require('bunyan');
const rfs = require('rotating-file-stream'); // Import the rotating file stream package
const path = require('path'); // Correct the path module import
const moment = require('moment');
// Create the logger instance
const customStream = {
  write: (logData) => {
    const log = JSON.parse(logData); // Parse the JSON log
    log.time = moment(log.time).format('YYYY-MM-DD HH:mm:ss'); // Format time field

    // Format the log message to include only selected fields
    const formattedLog = `[${log.time}]  ${log.msg}`;

    // Output the formatted log to the console
    console.log(formattedLog);
  }
};
const currentDate = moment().format('DD-MM-YYYY');
const log = bunyan.createLogger({
  name: 'Shortened-URL-Generator',
  level: 'info',
  streams: [
    {
      stream: rfs.createStream(`${currentDate}-log.log`, {  // Use date format to create a new log file each day
        path: path.join(__dirname, 'logs'), // Log file directory
        interval: '1d', // Rotate logs every day
        compress: true, // Compress rotated log files
        maxFiles: 7, // Keep logs for the last 7 days
        maxSize: '10M', // Optional: Set maximum log file size before rotation
      })
    },
    {
      stream: customStream // Custom stream to format the logs for console output
    }
  ]
});

// Export the log instance for use in other modules
module.exports = log;
