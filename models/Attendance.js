// ===== models/Attendance.js =====
module.exports = (sequelize, DataTypes) => {
  const Attendance = sequelize.define('Attendance', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    attendanceDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    month: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 12
      }
    },
    year: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 2000,
        max: 2100
      }
    },
    dutyType: {
      type: DataTypes.ENUM('Regular', 'Special', 'Emergency', 'Maintenance'),
      defaultValue: 'Regular',
      allowNull: false
    },
    hours: {
      type: DataTypes.DECIMAL(4, 2),
      defaultValue: 8.00,
      allowNull: false,
      validate: {
        min: 0.5,
        max: 24
      }
    },
    location: {
      type: DataTypes.STRING,
      allowNull: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    verifiedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'auth_users',
        key: 'id'
      }
    },
    status: {
      type: DataTypes.ENUM('Present', 'Absent', 'Late', 'Excused'),
      defaultValue: 'Present',
      allowNull: false
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'attendances',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['userId', 'month', 'year']
      },
      {
        fields: ['attendanceDate']
      },
      {
        fields: ['month', 'year']
      },
      {
        fields: ['status']
      },
      {
        fields: ['dutyType']
      }
    ],
    hooks: {
      afterCreate: async (attendance, options) => {
        // Update user's total attendance days and category
        const User = sequelize.models.User;
        const user = await User.findByPk(attendance.userId);
        
        if (user && attendance.status === 'Present') {
          user.totalAttendanceDays += 1;
          user.lastAttendanceDate = attendance.attendanceDate;
          await user.save();
        }
      },
      afterUpdate: async (attendance, options) => {
        // If status changed, update user's total attendance
        if (attendance.changed('status')) {
          const User = sequelize.models.User;
          const user = await User.findByPk(attendance.userId);
          
          if (user) {
            // Recalculate total attendance days
            const totalPresent = await Attendance.count({
              where: {
                userId: attendance.userId,
                status: 'Present'
              }
            });
            
            user.totalAttendanceDays = totalPresent;
            await user.save();
          }
        }
      }
    }
  });

  Attendance.associate = (models) => {
    // Attendance belongs to a User
    Attendance.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });

    // Attendance verified by AuthUser
    Attendance.belongsTo(models.AuthUser, {
      foreignKey: 'verifiedBy',
      as: 'verifier'
    });
  };

  // Instance methods
  Attendance.prototype.markPresent = function(verifiedBy = null) {
    this.status = 'Present';
    this.verifiedBy = verifiedBy;
    return this.save();
  };

  Attendance.prototype.markAbsent = function(verifiedBy = null, notes = null) {
    this.status = 'Absent';
    this.verifiedBy = verifiedBy;
    if (notes) this.notes = notes;
    return this.save();
  };

  // Class methods
  Attendance.getMonthlyStats = async function(year, month) {
    const stats = await Attendance.findAll({
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where: { year, month },
      group: ['status'],
      raw: true
    });
    
    return stats.reduce((acc, stat) => {
      acc[stat.status] = parseInt(stat.count);
      return acc;
    }, { Present: 0, Absent: 0, Late: 0, Excused: 0 });
  };

  Attendance.getYearlyStats = async function(year) {
    const stats = await Attendance.findAll({
      attributes: [
        'month',
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where: { year },
      group: ['month', 'status'],
      order: [['month', 'ASC']],
      raw: true
    });

    const monthlyData = {};
    for (let i = 1; i <= 12; i++) {
      monthlyData[i] = { Present: 0, Absent: 0, Late: 0, Excused: 0 };
    }

    stats.forEach(stat => {
      monthlyData[stat.month][stat.status] = parseInt(stat.count);
    });

    return monthlyData;
  };

  Attendance.getUserAttendance = async function(userId, year = null) {
    const whereClause = { userId };
    if (year) whereClause.year = year;

    return Attendance.findAll({
      where: whereClause,
      order: [['attendanceDate', 'DESC']],
      include: [
        {
          model: sequelize.models.AuthUser,
          as: 'verifier',
          attributes: ['fullName', 'role']
        }
      ]
    });
  };

  Attendance.checkUserAttendanceForMonth = async function(userId, year, month) {
    return Attendance.findOne({
      where: { userId, year, month }
    });
  };

  Attendance.getActiveMembers = async function(year, month) {
    // Members who attended in the specified month
    return Attendance.findAll({
      where: { 
        year, 
        month,
        status: 'Present'
      },
      include: [
        {
          model: sequelize.models.User,
          as: 'user',
          attributes: ['fullName', 'cardNumber', 'category']
        }
      ]
    });
  };

  return Attendance;
};