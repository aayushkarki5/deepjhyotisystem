// ===== models/AuthUser.js =====
const bcrypt = require('bcryptjs');

module.exports = (sequelize, DataTypes) => {
  const AuthUser = sequelize.define('AuthUser', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    username: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [3, 50],
        isAlphanumeric: true
      }
    },
    email: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
      validate: {
        isEmail: true,
        notEmpty: true
      }
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [6, 255]
      }
    },
    role: {
      type: DataTypes.ENUM('Chairman', 'Secretary', 'Member', 'Office Manager'),
      allowNull: false,
      defaultValue: 'Member'
    },
    fullName: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 100]
      }
    },
    contactNumber: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isNumeric: true,
        len: [10, 15]
      }
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false
    },
    lastLoginAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    passwordResetToken: {
      type: DataTypes.STRING,
      allowNull: true
    },
    passwordResetExpires: {
      type: DataTypes.DATE,
      allowNull: true
    },
    loginAttempts: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    },
    lockUntil: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'auth_users',
    timestamps: true,
    paranoid: true, // Enables soft delete
    indexes: [
      {
        unique: true,
        fields: ['username']
      },
      {
        unique: true,
        fields: ['email']
      },
      {
        fields: ['role']
      },
      {
        fields: ['isActive']
      }
    ],
    hooks: {
      beforeCreate: async (user, options) => {
        if (user.password) {
          const saltRounds = 12;
          user.password = await bcrypt.hash(user.password, saltRounds);
        }
      },
      beforeUpdate: async (user, options) => {
        if (user.changed('password')) {
          const saltRounds = 12;
          user.password = await bcrypt.hash(user.password, saltRounds);
        }
      }
    }
  });

  AuthUser.associate = (models) => {
    // AuthUser might be linked to a User profile (optional)
    AuthUser.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'userProfile',
      allowNull: true
    });
  };

  // Instance methods
  AuthUser.prototype.validatePassword = async function(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
  };

  AuthUser.prototype.updateLastLogin = function() {
    this.lastLoginAt = new Date();
    this.loginAttempts = 0;
    this.lockUntil = null;
    return this.save();
  };

  AuthUser.prototype.incrementLoginAttempts = function() {
    const maxAttempts = 5;
    const lockTime = 30 * 60 * 1000; // 30 minutes

    this.loginAttempts += 1;

    if (this.loginAttempts >= maxAttempts && !this.lockUntil) {
      this.lockUntil = new Date(Date.now() + lockTime);
    }

    return this.save();
  };

  AuthUser.prototype.resetLoginAttempts = function() {
    this.loginAttempts = 0;
    this.lockUntil = null;
    return this.save();
  };

  AuthUser.prototype.isLocked = function() {
    return this.lockUntil && this.lockUntil > new Date();
  };

  AuthUser.prototype.canLogin = function() {
    return this.isActive && !this.isLocked();
  };

  AuthUser.prototype.toJSON = function() {
    const values = Object.assign({}, this.get());
    delete values.password;
    delete values.passwordResetToken;
    delete values.passwordResetExpires;
    delete values.loginAttempts;
    delete values.lockUntil;
    return values;
  };

  // Class methods
  AuthUser.getRoleStats = async function() {
    const stats = await AuthUser.findAll({
      attributes: [
        'role',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where: { isActive: true },
      group: ['role'],
      raw: true
    });
    
    return stats.reduce((acc, stat) => {
      acc[stat.role] = parseInt(stat.count);
      return acc;
    }, { Chairman: 0, Secretary: 0, Member: 0, 'Office Manager': 0 });
  };

  AuthUser.findByUsernameOrEmail = function(identifier) {
    return AuthUser.findOne({
      where: {
        [sequelize.Op.or]: [
          { username: identifier },
          { email: identifier }
        ]
      }
    });
  };

  return AuthUser;
};