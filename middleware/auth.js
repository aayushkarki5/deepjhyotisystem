// ===== middleware/auth.js =====
const jwt = require('jsonwebtoken');
const { AuthUser } = require('../models');

// Verify JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    const user = await AuthUser.findByPk(decoded.userId, {
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token - user not found'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    if (user.isLocked()) {
      return res.status(401).json({
        success: false,
        message: 'Account is temporarily locked due to too many failed login attempts'
      });
    }

    // Add user to request
    req.user = user;
    next();

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }

    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication error'
    });
  }
};

// Role-based authorization
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required roles: ${roles.join(', ')}`
      });
    }

    next();
  };
};

// Check if user is Chairman
const requireChairman = (req, res, next) => {
  return authorizeRoles('Chairman')(req, res, next);
};

// Check if user is Secretary or Chairman
const requireSecretaryOrChairman = (req, res, next) => {
  return authorizeRoles('Secretary', 'Chairman')(req, res, next);
};

// Check if user is Office Manager, Secretary, or Chairman
const requireManagement = (req, res, next) => {
  return authorizeRoles('Office Manager', 'Secretary', 'Chairman')(req, res, next);
};

// Check if user can access their own data or is management
const requireOwnershipOrManagement = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  // Management can access any data
  const managementRoles = ['Chairman', 'Secretary', 'Office Manager'];
  if (managementRoles.includes(req.user.role)) {
    return next();
  }

  // Regular members can only access their own data
  const resourceUserId = req.params.userId || req.params.id || req.body.userId;
  
  if (req.user.id === resourceUserId || req.user.userId === resourceUserId) {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: 'Access denied. You can only access your own data.'
  });
};

// Optional authentication (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await AuthUser.findByPk(decoded.userId, {
        attributes: { exclude: ['password'] }
      });

      if (user && user.isActive && !user.isLocked()) {
        req.user = user;
      }
    }

    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

// Rate limiting per user
const userRateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  const requests = new Map();

  return (req, res, next) => {
    if (!req.user) {
      return next();
    }

    const userId = req.user.id;
    const now = Date.now();
    const windowStart = now - windowMs;

    if (!requests.has(userId)) {
      requests.set(userId, []);
    }

    const userRequests = requests.get(userId);
    
    // Remove old requests
    const recentRequests = userRequests.filter(time => time > windowStart);
    requests.set(userId, recentRequests);

    if (recentRequests.length >= maxRequests) {
      return res.status(429).json({
        success: false,
        message: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }

    recentRequests.push(now);
    next();
  };
};

// Check if user has specific permission
const hasPermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Define role permissions
    const rolePermissions = {
      'Chairman': [
        'read:all', 'write:all', 'delete:all', 'manage:users', 
        'manage:goals', 'manage:team', 'approve:distributions'
      ],
      'Secretary': [
        'read:all', 'write:all', 'manage:attendance', 'manage:inventory',
        'manage:distributions', 'manage:users', 'approve:distributions'
      ],
      'Office Manager': [
        'read:all', 'write:team', 'manage:team', 'read:reports'
      ],
      'Member': [
        'read:own', 'write:own'
      ]
    };

    const userPermissions = rolePermissions[req.user.role] || [];
    
    if (!userPermissions.includes(permission) && !userPermissions.includes('write:all')) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required permission: ${permission}`
      });
    }

    next();
  };
};

module.exports = {
  authenticateToken,
  authorizeRoles,
  requireChairman,
  requireSecretaryOrChairman,
  requireManagement,
  requireOwnershipOrManagement,
  optionalAuth,
  userRateLimit,
  hasPermission
};