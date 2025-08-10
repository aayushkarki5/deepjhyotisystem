// Custom Error Classes
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message) {
    super(message, 400);
    this.name = 'ValidationError';
  }
}

class NotFoundError extends AppError {
  constructor(resource) {
    super(`${resource} not found`, 404);
    this.name = 'NotFoundError';
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized access') {
    super(message, 401);
    this.name = 'UnauthorizedError';
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Forbidden access') {
    super(message, 403);
    this.name = 'ForbiddenError';
  }
}

class ConflictError extends AppError {
  constructor(message) {
    super(message, 409);
    this.name = 'ConflictError';
  }
}

// Database error handlers
const handleSequelizeValidationError = (error) => {
  const errors = error.errors.map(err => ({
    field: err.path,
    message: err.message,
    value: err.value
  }));
  
  return new ValidationError(`Invalid input data: ${errors.map(e => e.message).join(', ')}`);
};

const handleSequelizeUniqueConstraintError = (error) => {
  const field = error.errors[0].path;
  const message = `${field} already exists. Please use another value.`;
  return new ConflictError(message);
};

const handleSequelizeForeignKeyConstraintError = (error) => {
  const message = 'Invalid reference to related resource';
  return new ValidationError(message);
};

const handleSequelizeConnectionError = (error) => {
  return new AppError('Database connection failed. Please try again later.', 500);
};

const handleJWTError = () => new UnauthorizedError('Invalid token. Please log in again.');

const handleJWTExpiredError = () => new UnauthorizedError('Your token has expired. Please log in again.');

// Development error response
const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    success: false,
    error: err,
    message: err.message,
    stack: err.stack,
    ...(err.errors && { errors: err.errors })
  });
};

// Production error response
const sendErrorProd = (err, res) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.errors && { errors: err.errors })
    });
  } 
  // Programming or other unknown error: don't leak error details
  else {
    // Log error for debugging
    console.error('ERROR 💥', err);
    
    // Send generic message
    res.status(500).json({
      success: false,
      message: 'Something went wrong! Please try again later.'
    });
  }
};

// Main error handling middleware
const globalErrorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else {
    let error = { ...err };
    error.message = err.message;
    error.name = err.name;

    // Handle different types of errors
    if (error.name === 'SequelizeValidationError') {
      error = handleSequelizeValidationError(error);
    } else if (error.name === 'SequelizeUniqueConstraintError') {
      error = handleSequelizeUniqueConstraintError(error);
    } else if (error.name === 'SequelizeForeignKeyConstraintError') {
      error = handleSequelizeForeignKeyConstraintError(error);
    } else if (error.name === 'SequelizeConnectionError' || error.name === 'SequelizeTimeoutError') {
      error = handleSequelizeConnectionError(error);
    } else if (error.name === 'JsonWebTokenError') {
      error = handleJWTError();
    } else if (error.name === 'TokenExpiredError') {
      error = handleJWTExpiredError();
    } else if (error.name === 'CastError') {
      error = new ValidationError(`Invalid ${error.path}: ${error.value}`);
    }

    sendErrorProd(error, res);
  }
};

// Async error wrapper
const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

// 404 handler for undefined routes
const notFoundHandler = (req, res, next) => {
  const err = new NotFoundError(`Route ${req.originalUrl} not found`);
  next(err);
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log('UNHANDLED REJECTION! 💥 Shutting down...');
  console.log(err.name, err.message);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.log('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.log(err.name, err.message);
  process.exit(1);
});

// Validation helper functions
const validateRequiredFields = (data, requiredFields) => {
  const missingFields = requiredFields.filter(field => !data[field]);
  if (missingFields.length > 0) {
    throw new ValidationError(`Missing required fields: ${missingFields.join(', ')}`);
  }
};

const validateNumericRange = (value, fieldName, min = 0, max = Infinity) => {
  if (typeof value !== 'number' || value < min || value > max) {
    throw new ValidationError(`${fieldName} must be a number between ${min} and ${max}`);
  }
};

const validateDateRange = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (start > end) {
    throw new ValidationError('Start date must be before end date');
  }
};

const validateEnum = (value, fieldName, allowedValues) => {
  if (!allowedValues.includes(value)) {
    throw new ValidationError(`${fieldName} must be one of: ${allowedValues.join(', ')}`);
  }
};

// Success response helper
const sendSuccessResponse = (res, data, message = 'Success', statusCode = 200) => {
  res.status(statusCode).json({
    success: true,
    message,
    data
  });
};

// Pagination helper
const getPaginationMetadata = (page, limit, totalCount) => {
  const totalPages = Math.ceil(totalCount / limit);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;
  
  return {
    pagination: {
      currentPage: page,
      totalPages,
      totalCount,
      limit,
      hasNext,
      hasPrev
    }
  };
};

// Log request information for debugging
const requestLogger = (req, res, next) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
    if (req.body && Object.keys(req.body).length > 0) {
      console.log('Request body:', req.body);
    }
    if (req.params && Object.keys(req.params).length > 0) {
      console.log('Request params:', req.params);
    }
    if (req.query && Object.keys(req.query).length > 0) {
      console.log('Request query:', req.query);
    }
  }
  next();
};

module.exports = {
  // Error Classes
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  
  // Main middleware
  globalErrorHandler,
  catchAsync,
  notFoundHandler,
  requestLogger,
  
  // Helper functions
  validateRequiredFields,
  validateNumericRange,
  validateDateRange,
  validateEnum,
  sendSuccessResponse,
  getPaginationMetadata
};
