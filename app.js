// Core dependencies
const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

// Custom middlewares
const errorHandler = require('./middleware/errorHandler');

// Create express app
const app = express();

// ---------------------
// Middleware setup
// ---------------------
app.use(helmet()); // Security headers
app.use(compression()); // Gzip compression
app.use(cors()); // Allow cross-origin requests
app.use(express.json()); // Parse JSON body
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded body
app.use(morgan('dev')); // Logging

// Static files (uploads)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 min
    max: 100,
    message: { message: 'Too many requests from this IP, please try again later' }
});
app.use('/api', limiter);

// ---------------------
// Routes
// ---------------------
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/distribution', require('./routes/distribution'));
app.use('/api/goals', require('./routes/goals'));
app.use('/api/team', require('./routes/team'));
app.use('/api/dashboard', require('./routes/dashboard'));

// ---------------------
// Error handling
// ---------------------
app.use(errorHandler);

module.exports = app;
