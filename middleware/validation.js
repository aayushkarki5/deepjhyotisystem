const { body, param, query, validationResult } = require('express-validator');

// Helper function to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation errors',
      errors: errors.array()
    });
  }
  next();
};

// User validation rules
const validateUser = [
  body('name')
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  
  body('category')
    .isIn(['forest_member', 'local_resident', 'official'])
    .withMessage('Category must be forest_member, local_resident, or official'),
  
  body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Invalid phone number format'),
  
  body('address')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Address cannot exceed 200 characters'),
  
  body('cnic')
    .optional()
    .matches(/^\d{5}-\d{7}-\d{1}$/)
    .withMessage('CNIC format should be XXXXX-XXXXXXX-X'),
  
  body('emergency_contact')
    .optional()
    .isMobilePhone()
    .withMessage('Invalid emergency contact format'),
  
  handleValidationErrors
];

// AuthUser validation rules
const validateAuthUser = [
  body('username')
    .notEmpty()
    .withMessage('Username is required')
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  
  body('email')
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  
  body('role')
    .isIn(['admin', 'manager', 'member'])
    .withMessage('Role must be admin, manager, or member'),
  
  handleValidationErrors
];

// Login validation
const validateLogin = [
  body('email')
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  
  handleValidationErrors
];

// Attendance validation rules
const validateAttendance = [
  body('user_id')
    .isInt({ min: 1 })
    .withMessage('Valid user ID is required'),
  
  body('date')
    .isISO8601()
    .withMessage('Valid date is required')
    .toDate(),
  
  body('duty_type')
    .isIn(['patrolling', 'maintenance', 'monitoring', 'administrative', 'emergency'])
    .withMessage('Invalid duty type'),
  
  body('hours_worked')
    .optional()
    .isFloat({ min: 0, max: 24 })
    .withMessage('Hours worked must be between 0 and 24'),
  
  body('location')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Location cannot exceed 100 characters'),
  
  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters'),
  
  handleValidationErrors
];

// Wood Inventory validation rules
const validateWoodInventory = [
  body('wood_type')
    .notEmpty()
    .withMessage('Wood type is required')
    .isLength({ max: 50 })
    .withMessage('Wood type cannot exceed 50 characters'),
  
  body('quantity')
    .isFloat({ min: 0 })
    .withMessage('Quantity must be a positive number'),
  
  body('unit')
    .isIn(['cubic_feet', 'cubic_meter', 'ton', 'pieces'])
    .withMessage('Invalid unit type'),
  
  body('source_location')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Source location cannot exceed 100 characters'),
  
  body('quality_grade')
    .optional()
    .isIn(['A', 'B', 'C', 'D'])
    .withMessage('Quality grade must be A, B, C, or D'),
  
  body('estimated_value')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Estimated value must be a positive number'),
  
  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters'),
  
  handleValidationErrors
];

// Wood Distribution validation rules
const validateWoodDistribution = [
  body('inventory_id')
    .isInt({ min: 1 })
    .withMessage('Valid inventory ID is required'),
  
  body('distributed_to')
    .notEmpty()
    .withMessage('Distributed to field is required')
    .isLength({ max: 100 })
    .withMessage('Distributed to cannot exceed 100 characters'),
  
  body('quantity_distributed')
    .isFloat({ min: 0 })
    .withMessage('Quantity distributed must be a positive number'),
  
  body('distribution_date')
    .isISO8601()
    .withMessage('Valid distribution date is required')
    .toDate(),
  
  body('purpose')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Purpose cannot exceed 200 characters'),
  
  body('authorized_by')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Authorized by must be a valid user ID'),
  
  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters'),
  
  handleValidationErrors
];

// Yearly Goals validation rules
const validateYearlyGoals = [
  body('year')
    .isInt({ min: 2000, max: 2100 })
    .withMessage('Year must be between 2000 and 2100'),
  
  body('goal_type')
    .notEmpty()
    .withMessage('Goal type is required')
    .isLength({ max: 100 })
    .withMessage('Goal type cannot exceed 100 characters'),
  
  body('target_value')
    .isFloat({ min: 0 })
    .withMessage('Target value must be a positive number'),
  
  body('unit')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Unit cannot exceed 50 characters'),
  
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  
  body('current_progress')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Current progress must be a positive number'),
  
  handleValidationErrors
];

// Office Team validation rules
const validateOfficeTeam = [
  body('user_id')
    .isInt({ min: 1 })
    .withMessage('Valid user ID is required'),
  
  body('position')
    .notEmpty()
    .withMessage('Position is required')
    .isLength({ max: 100 })
    .withMessage('Position cannot exceed 100 characters'),
  
  body('department')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Department cannot exceed 100 characters'),
  
  body('start_date')
    .isISO8601()
    .withMessage('Valid start date is required')
    .toDate(),
  
  body('end_date')
    .optional()
    .isISO8601()
    .withMessage('Valid end date is required')
    .toDate(),
  
  body('salary')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Salary must be a positive number'),
  
  body('responsibilities')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Responsibilities cannot exceed 1000 characters'),
  
  handleValidationErrors
];

// ID parameter validation
const validateId = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Valid ID is required'),
  
  handleValidationErrors
];

// Query parameter validations
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  handleValidationErrors
];

const validateDateRange = [
  query('start_date')
    .optional()
    .isISO8601()
    .withMessage('Valid start date is required')
    .toDate(),
  
  query('end_date')
    .optional()
    .isISO8601()
    .withMessage('Valid end date is required')
    .toDate(),
  
  handleValidationErrors
];

// Update validation (for PATCH requests - fields are optional)
const validateUserUpdate = [
  body('name')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  
  body('category')
    .optional()
    .isIn(['forest_member', 'local_resident', 'official'])
    .withMessage('Category must be forest_member, local_resident, or official'),
  
  body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Invalid phone number format'),
  
  body('address')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Address cannot exceed 200 characters'),
  
  body('cnic')
    .optional()
    .matches(/^\d{5}-\d{7}-\d{1}$/)
    .withMessage('CNIC format should be XXXXX-XXXXXXX-X'),
  
  body('emergency_contact')
    .optional()
    .isMobilePhone()
    .withMessage('Invalid emergency contact format'),
  
  handleValidationErrors
];

// Password change validation
const validatePasswordChange = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number'),
  
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Password confirmation does not match');
      }
      return true;
    }),
  
  handleValidationErrors
];

module.exports = {
  // Main validation functions
  validateUser,
  validateUserUpdate,
  validateAuthUser,
  validateLogin,
  validateAttendance,
  validateWoodInventory,
  validateWoodDistribution,
  validateYearlyGoals,
  validateOfficeTeam,
  
  // Utility validations
  validateId,
  validatePagination,
  validateDateRange,
  validatePasswordChange,
  
  // Helper function
  handleValidationErrors
};