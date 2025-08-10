// ===== models/User.js =====
module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    cardNumber: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 50]
      }
    },
    fullName: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 100]
      }
    },
    grandfatherName: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 100]
      }
    },
    photo: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null
    },
    familyDetails: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    contactNumber: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isNumeric: true,
        len: [10, 15]
      }
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    dateOfBirth: {
      type: DataTypes.DATE,
      allowNull: true
    },
    joinedDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    category: {
      type: DataTypes.ENUM('A', 'B', 'C'),
      defaultValue: 'C',
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('Active', 'Passive'),
      defaultValue: 'Passive',
      allowNull: false
    },
    totalAttendanceDays: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    },
    lastAttendanceDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'users',
    timestamps: true,
    paranoid: true, // Enables soft delete
    indexes: [
      {
        unique: true,
        fields: ['cardNumber']
      },
      {
        fields: ['category']
      },
      {
        fields: ['status']
      },
      {
        fields: ['fullName']
      }
    ],
    hooks: {
      beforeSave: (user, options) => {
        // Update category based on total attendance days
        if (user.totalAttendanceDays >= 75) {
          user.category = 'A';
        } else if (user.totalAttendanceDays > 35) {
          user.category = 'B';
        } else {
          user.category = 'C';
        }
      }
    }
  });

  User.associate = (models) => {
    // User has many attendance records
    User.hasMany(models.Attendance, {
      foreignKey: 'userId',
      as: 'attendances'
    });

    // User has many wood distributions
    User.hasMany(models.WoodDistribution, {
      foreignKey: 'userId',
      as: 'woodDistributions'
    });
  };

  // Instance methods
  User.prototype.updateCategory = function() {
    if (this.totalAttendanceDays >= 75) {
      this.category = 'A';
    } else if (this.totalAttendanceDays > 35) {
      this.category = 'B';
    } else {
      this.category = 'C';
    }
    return this.save();
  };

  User.prototype.updateStatus = function() {
    // Logic to determine if user is Active or Passive
    // Active means they attended every month in the current year
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    
    // This will be implemented with attendance checking logic
    // For now, default behavior
    return this.save();
  };

  // Class methods
  User.getCategoryStats = async function() {
    const stats = await User.findAll({
      attributes: [
        'category',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where: { isActive: true },
      group: ['category'],
      raw: true
    });
    
    return stats.reduce((acc, stat) => {
      acc[stat.category] = parseInt(stat.count);
      return acc;
    }, { A: 0, B: 0, C: 0 });
  };

  User.getStatusStats = async function() {
    const stats = await User.findAll({
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where: { isActive: true },
      group: ['status'],
      raw: true
    });
    
    return stats.reduce((acc, stat) => {
      acc[stat.status] = parseInt(stat.count);
      return acc;
    }, { Active: 0, Passive: 0 });
  };

  return User;
};