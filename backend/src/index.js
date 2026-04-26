require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { init } = require('./db/init');
const logger = require('./utils/logger');

const app = express();


// Security Headers
if (process.env.HELMET_ENABLED !== 'false') {
  app.use(helmet());
}

// CORS Configuration
const corsOptions = {
  origin: (process.env.CORS_ORIGIN || 'http://localhost:3000').split(','),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));

// Rate Limiting
if (process.env.RATE_LIMIT_ENABLED !== 'false') {
  const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '2000'),
    message: { message: 'Trop de requêtes, veuillez réessayer dans quelques minutes.' },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.path === '/api/health',
  });
  app.use('/api/', limiter);
}

// Body Parsing
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ limit: '5mb', extended: true }));

// Static file serving — KYC uploads
const path = require('path');
const uploadsPath = path.join(__dirname, '..', 'uploads');
logger.info(`Serving uploads from: ${uploadsPath}`);
app.use('/uploads', express.static(uploadsPath, { fallthrough: false }));

// Request Logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// ====================================
// API Routes
// ====================================

const apiVersion = process.env.API_VERSION || 'v1';
const apiBase = `/api/${apiVersion}`;

app.use(`${apiBase}/auth`, require('./routes/auth'));
app.use(`${apiBase}/user`, require('./routes/account'));
app.use(`${apiBase}/user`, require('./routes/user'));
app.use(`${apiBase}/admin`, require('./routes/admin'));
app.use(`${apiBase}/chatbot`, require('./routes/chatbot'));

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'Sayzen Bank API',
    version: apiVersion,
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// ====================================
// Error Handling
// ====================================

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.path} not found`,
    timestamp: new Date().toISOString()
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  logger.error(`Error: ${message}`, {
    status,
    path: req.path,
    method: req.method,
    stack: err.stack
  });

  res.status(status).json({
    error: err.name || 'Error',
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ====================================
// Server Initialization
// ====================================

async function start() {
  try {
    // Initialize database 
    await init();
    logger.info('Database initialized successfully');

    const PORT = process.env.PORT || 5000;
    const NODE_ENV = process.env.NODE_ENV || 'development';

    app.listen(PORT, () => {
      logger.info(`Sayzen Bank API running on port ${PORT} [${NODE_ENV}]`);
      logger.info(`Base URL: http://localhost:${PORT}${apiBase}`);
    });
  } catch (err) {
    logger.error('Failed to start server', err);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  process.exit(0);
});

start();

module.exports = app;
