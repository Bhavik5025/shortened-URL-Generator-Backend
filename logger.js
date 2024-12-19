const bunyan = require('bunyan');

// Create a logger instance
const logger = bunyan.createLogger({
  name: 'Shortened-URL-Generator', 
  level: 'info', 
  streams: [
    {
      level: 'info',
      stream: process.stdout, // Logs to console
    },
  ],
  serializers: bunyan.stdSerializers, 
});

module.exports = logger;
