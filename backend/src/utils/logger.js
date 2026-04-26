
const fs = require('fs');
const path = require('path');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

const LOG_LEVEL = LOG_LEVELS[process.env.LOG_LEVEL || 'info'];

const getTimestamp = () => {
  return new Date().toISOString();
};

const formatMessage = (level, message, metadata = {}) => {
  const timestamp = getTimestamp();
  const obj = {
    timestamp,
    level,
    message,
    ...metadata
  };
  return JSON.stringify(obj);
};

const writeToFile = (level, message, metadata) => {
  const logFile = path.join(logsDir, `${level}.log`);
  const logMessage = formatMessage(level, message, metadata) + '\n';
  fs.appendFileSync(logFile, logMessage, 'utf8');
};

const logger = {
  error: (message, metadata = {}) => {
    if (LOG_LEVELS.error <= LOG_LEVEL) {
      writeToFile('error', message, metadata);
      console.error(`❌ [ERROR] ${message}`, metadata);
    }
  },

  warn: (message, metadata = {}) => {
    if (LOG_LEVELS.warn <= LOG_LEVEL) {
      writeToFile('warn', message, metadata);
      console.warn(`⚠️  [WARN] ${message}`, metadata);
    }
  },

  info: (message, metadata = {}) => {
    if (LOG_LEVELS.info <= LOG_LEVEL) {
      writeToFile('info', message, metadata);
      console.log(`ℹ️  [INFO] ${message}`, metadata);
    }
  },

  debug: (message, metadata = {}) => {
    if (LOG_LEVELS.debug <= LOG_LEVEL) {
      writeToFile('debug', message, metadata);
      console.debug(`🐛 [DEBUG] ${message}`, metadata);
    }
  }
};

module.exports = logger;
