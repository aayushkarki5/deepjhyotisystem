const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { AuthUser, User } = require('../models');
const { 
  catchAsync, 
  AppError, 
  UnauthorizedError, 
  ConflictError, 
  sendSuccessResponse 
} = require('../middleware/errorHandler');

// Generate JWT Token
const generateToken = (id, role, email) => {
  return jwt.sign(
    { id, role, email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// Create and send token response
const createSendToken = (user, statusCode, res, message) => {
  const token = generateToken(user.id, user.role, user.email);
  
  // Cookie options
  const cookieOptions = {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  };

  // Send cookie
  res.cookie('jwt', token, cookieOptions);

  // Remove password from output
  const userOutput = {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    isActive: user.is_active,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };

  res.status(statusCode).json({
    success: true,
    message,
    token,
    data: {
      user: userOutput
    }
  });
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public (but might want to restrict to admin only)
const register = catchAsync(async (req, res, next) => {
  const { username, email, password, role = 'member' } = req.body;

  // Check if user already exists
  const existingUser = await AuthUser.findOne({
    where: {
      [Op.or]: [{ email }, { username }]
    }
  });

  if (existingUser) {
    return next(new ConflictError('User with this email or username already exists'));
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 12);

  // Create user
  const user = await AuthUser.create({
    username,
    email,
    password: hashedPassword,
    role,
    is_active: true
  });

  createSendToken(user, 201, res, 'User registered successfully');
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // Find user by email
  const user = await AuthUser.findOne({ 
    where: { email },
    include: [{
      model: User,
      as: 'userProfile',
      required: false
    }]
  });

  // Check if user exists and password is correct
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return next(new UnauthorizedError('Invalid email or password'));
  }

  // Check if user is active
  if (!user.is_active) {
    return next(new UnauthorizedError('Your account has been deactivated. Please contact an administrator.'));
  }

  // Update last login
  await user.update({ 
    last_login: new Date() 
  });

  createSendToken(user, 200, res, 'Login successful');
});

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
const logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });

  res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
const getMe = catchAsync(async (req, res, next) => {
  const user = await AuthUser.findByPk(req.user.id, {
    attributes: { exclude: ['password'] },
    include: [{
      model: User,
      as: 'userProfile',
      required: false
    }]
  });

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  sendSuccessResponse(res, user, 'User profile retrieved successfully');
});

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = catchAsync(async (req, res, next) => {
  const { username, email } = req.body;
  
  const user = await AuthUser.findByPk(req.user.id);
  
  if (!user) {
    return next(new AppError('User not found', 404));
  }

  // Check if email/username is already taken by another user
  if (email && email !== user.email) {
    const existingUser = await AuthUser.findOne({
      where: { email, id: { [Op.ne]: user.id } }
    });
    if (existingUser) {
      return next(new ConflictError('Email is already taken'));
    }
  }

  if (username && username !== user.username) {
    const existingUser = await AuthUser.findOne({
      where: { username, id: { [Op.ne]: user.id } }
    });
    if (existingUser) {
      return next(new ConflictError('Username is already taken'));
    }
  }

  // Update user
  await user.update({
    username: username || user.username,
    email: email || user.email,
    updatedAt: new Date()
  });

  // Get updated user without password
  const updatedUser = await AuthUser.findByPk(user.id, {
    attributes: { exclude: ['password'] }
  });

  sendSuccessResponse(res, updatedUser, 'Profile updated successfully');
});

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
const changePassword = catchAsync(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  // Get user with password
  const user = await AuthUser.findByPk(req.user.id);

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  // Check current password
  if (!(await bcrypt.compare(currentPassword, user.password))) {
    return next(new UnauthorizedError('Current password is incorrect'));
  }

  // Hash new password
  const hashedNewPassword = await bcrypt.hash(newPassword, 12);

  // Update password
  await user.update({ 
    password: hashedNewPassword,
    updatedAt: new Date()
  });

  res.status(200).json({
    success: true,
    message: 'Password changed successfully'
  });
});

// @desc    Refresh token
// @route   POST /api/auth/refresh
// @access  Private
const refreshToken = catchAsync(async (req, res, next) => {
  const user = await AuthUser.findByPk(req.user.id, {
    attributes: { exclude: ['password'] }
  });

  if (!user || !user.is_active) {
    return next(new UnauthorizedError('User not found or inactive'));
  }

  createSendToken(user, 200, res, 'Token refreshed successfully');
});

// @desc    Get dashboard stats
// @route   GET /api/auth/dashboard-stats
// @access  Private
const getDashboardStats = catchAsync(async (req, res, next) => {
  const { Op } = require('sequelize');
  const { WoodInventory, WoodDistribution, Attendance, YearlyGoals, OfficeTeam } = require('../models');

  // Get various statistics for the dashboard
  const [
    totalUsers,
    totalAttendanceRecords,
    totalWoodDistributed,
    totalInventoryItems,
    totalGoals,
    recentActivities
  ] = await Promise.all([
    // Total users count
    User.count(),
    
    // Total attendance records
    Attendance.count(),
    
    // Total wood distributed (sum of quantities)
    WoodDistribution.sum('quantity_distributed'),
    
    // Total inventory items
    WoodInventory.count(),
    
    // Total yearly goals
    YearlyGoals.count(),
    
    // Recent activities (last 10 records)
    Promise.all([
      User.findAll({
        order: [['createdAt', 'DESC']],
        limit: 5,
        attributes: ['name', 'createdAt']
      }),
      Attendance.findAll({
        order: [['createdAt', 'DESC']],
        limit: 3,
        include: [{ model: User, attributes: ['name'] }]
      }),
      WoodDistribution.findAll({
        order: [['createdAt', 'DESC']],
        limit: 2,
        attributes: ['distributed_to', 'quantity_distributed', 'createdAt']
      })
    ])
  ]);

  const stats = {
    totalUsers: totalUsers || 0,
    attendanceRecords: totalAttendanceRecords || 0,
    woodDistributed: totalWoodDistributed || 0,
    inventoryItems: totalInventoryItems || 0,
    teamGoals: totalGoals || 0,
    recentActivities: {
      newUsers: recentActivities[0],
      recentAttendance: recentActivities[1],
      recentDistributions: recentActivities[2]
    }
  };

  sendSuccessResponse(res, stats, 'Dashboard statistics retrieved successfully');
});

// @desc    Forgot password (generate reset token)
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = catchAsync(async (req, res, next) => {
  const { email } = req.body;

  const user = await AuthUser.findOne({ where: { email } });

  if (!user) {
    return next(new AppError('No user found with that email address', 404));
  }

  // Generate reset token (in production, you'd send this via email)
  const resetToken = jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET + user.password, // Include password as part of secret
    { expiresIn: '15m' }
  );

  // In production, send email with reset link
  // For now, we'll just return the token (remove this in production!)
  res.status(200).json({
    success: true,
    message: 'Password reset token generated',
    // Remove this in production - token should be sent via email
    resetToken: resetToken
  });
});

// @desc    Reset password
// @route   POST /api/auth/reset-password/:token
// @access  Public
const resetPassword = catchAsync(async (req, res, next) => {
  const { token } = req.params;
  const { newPassword } = req.body;

  try {
    // First decode without verification to get user id
    const decoded = jwt.decode(token);
    
    if (!decoded) {
      return next(new AppError('Invalid token', 400));
    }

    // Get user
    const user = await AuthUser.findByPk(decoded.id);
    
    if (!user) {
      return next(new AppError('User not found', 404));
    }

    // Verify token with user's password as part of secret
    jwt.verify(token, process.env.JWT_SECRET + user.password);

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await user.update({ 
      password: hashedPassword,
      updatedAt: new Date()
    });

    res.status(200).json({
      success: true,
      message: 'Password reset successfully'
    });

  } catch (error) {
    return next(new AppError('Invalid or expired token', 400));
  }
});

module.exports = {
  register,
  login,
  logout,
  getMe,
  updateProfile,
  changePassword,
  refreshToken,
  getDashboardStats,
  forgotPassword,
  resetPassword
};