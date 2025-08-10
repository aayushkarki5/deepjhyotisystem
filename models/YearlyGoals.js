// ===== models/YearlyGoals.js =====
module.exports = (sequelize, DataTypes) => {
  const YearlyGoals = sequelize.define('YearlyGoals', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    year: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      validate: {
        min: 2000,
        max: 2100
      }
    },
    targetWoodDistribution: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0,
      validate: {
        min: 0
      },
      comment: 'Total wood distribution target for the year'
    },
    targetAttendanceRate: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      defaultValue: 80.00,
      validate: {
        min: 0,
        max: 100
      },
      comment: 'Target attendance rate percentage'
    },
    targetActiveMembers: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      validate: {
        min: 0
      },
      comment: 'Target number of active members'
    },
    targetNewMembers: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      validate: {
        min: 0
      },
      comment: 'Target new member registrations'
    },
    targetRevenue: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      defaultValue: 0,
      validate: {
        min: 0
      },
      comment: 'Target revenue from wood sales'
    },
    targetCategoryAMembers: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      validate: {
        min: 0
      },
      comment: 'Target members in Category A (75+ attendance days)'
    },
    targetForestMaintenance: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 12,
      validate: {
        min: 0
      },
      comment: 'Target forest maintenance activities per year'
    },
    targetTreePlanting: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      validate: {
        min: 0
      },
      comment: 'Target number of trees to plant'
    },
    budgetAllocation: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      defaultValue: 0,
      validate: {
        min: 0
      },
      comment: 'Total budget allocated for the year'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Additional goals description'
    },
    status: {
      type: DataTypes.ENUM('Draft', 'Active', 'Completed', 'Cancelled'),
      defaultValue: 'Draft',
      allowNull: false
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'auth_users',
        key: 'id'
      }
    },
    approvedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'auth_users',
        key: 'id'
      }
    },
    approvedDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    completedDate: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'yearly_goals',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['year']
      },
      {
        fields: ['status']
      },
      {
        fields: ['createdBy']
      }
    ],
    hooks: {
      beforeSave: (goal, options) => {
        // Auto-set approved date when status changes to Active
        if (goal.changed('status') && goal.status === 'Active' && !goal.approvedDate) {
          goal.approvedDate = new Date();
        }

        // Auto-set completed date when status changes to Completed
        if (goal.changed('status') && goal.status === 'Completed' && !goal.completedDate) {
          goal.completedDate = new Date();
        }
      }
    }
  });

  YearlyGoals.associate = (models) => {
    // YearlyGoals created by AuthUser
    YearlyGoals.belongsTo(models.AuthUser, {
      foreignKey: 'createdBy',
      as: 'creator'
    });

    // YearlyGoals approved by AuthUser
    YearlyGoals.belongsTo(models.AuthUser, {
      foreignKey: 'approvedBy',
      as: 'approver'
    });
  };

  // Instance methods
  YearlyGoals.prototype.activate = function(approvedBy) {
    this.status = 'Active';
    this.approvedBy = approvedBy;
    this.approvedDate = new Date();
    return this.save();
  };

  YearlyGoals.prototype.complete = function() {
    this.status = 'Completed';
    this.completedDate = new Date();
    return this.save();
  };

  YearlyGoals.prototype.cancel = function() {
    this.status = 'Cancelled';
    return this.save();
  };

  YearlyGoals.prototype.getProgress = async function() {
    const currentYear = this.year;
    
    // Get actual statistics for comparison
    const WoodDistribution = sequelize.models.WoodDistribution;
    const User = sequelize.models.User;
    const Attendance = sequelize.models.Attendance;

    // Wood distribution progress
    const actualWoodDistribution = await WoodDistribution.sum('quantity', {
      where: {
        status: 'Delivered',
        distributionDate: {
          [sequelize.Op.between]: [
            new Date(currentYear, 0, 1),
            new Date(currentYear, 11, 31)
          ]
        }
      }
    }) || 0;

    // Revenue progress
    const actualRevenue = await WoodDistribution.sum('totalPrice', {
      where: {
        status: 'Delivered',
        paymentStatus: 'Paid',
        distributionDate: {
          [sequelize.Op.between]: [
            new Date(currentYear, 0, 1),
            new Date(currentYear, 11, 31)
          ]
        }
      }
    }) || 0;

    // Member statistics
    const memberStats = await User.findAll({
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalMembers'],
        [sequelize.fn('COUNT', sequelize.literal("CASE WHEN status = 'Active' THEN 1 END")), 'activeMembers'],
        [sequelize.fn('COUNT', sequelize.literal("CASE WHEN category = 'A' THEN 1 END")), 'categoryAMembers']
      ],
      where: { isActive: true },
      raw: true
    });

    const stats = memberStats[0] || {};

    // New members this year
    const newMembers = await User.count({
      where: {
        joinedDate: {
          [sequelize.Op.between]: [
            new Date(currentYear, 0, 1),
            new Date(currentYear, 11, 31)
          ]
        },
        isActive: true
      }
    });

    // Attendance rate calculation
    const totalAttendances = await Attendance.count({
      where: { 
        year: currentYear, 
        status: 'Present' 
      }
    });

    const totalPossibleAttendances = await Attendance.count({
      where: { year: currentYear }
    });

    const attendanceRate = totalPossibleAttendances > 0 ? 
      (totalAttendances / totalPossibleAttendances) * 100 : 0;

    return {
      woodDistribution: {
        target: parseFloat(this.targetWoodDistribution) || 0,
        actual: parseFloat(actualWoodDistribution),
        percentage: this.targetWoodDistribution > 0 ? 
          (actualWoodDistribution / this.targetWoodDistribution) * 100 : 0
      },
      revenue: {
        target: parseFloat(this.targetRevenue) || 0,
        actual: parseFloat(actualRevenue),
        percentage: this.targetRevenue > 0 ? 
          (actualRevenue / this.targetRevenue) * 100 : 0
      },
      activeMembers: {
        target: this.targetActiveMembers || 0,
        actual: parseInt(stats.activeMembers) || 0,
        percentage: this.targetActiveMembers > 0 ? 
          ((parseInt(stats.activeMembers) || 0) / this.targetActiveMembers) * 100 : 0
      },
      newMembers: {
        target: this.targetNewMembers || 0,
        actual: newMembers,
        percentage: this.targetNewMembers > 0 ? 
          (newMembers / this.targetNewMembers) * 100 : 0
      },
      categoryAMembers: {
        target: this.targetCategoryAMembers || 0,
        actual: parseInt(stats.categoryAMembers) || 0,
        percentage: this.targetCategoryAMembers > 0 ? 
          ((parseInt(stats.categoryAMembers) || 0) / this.targetCategoryAMembers) * 100 : 0
      },
      attendanceRate: {
        target: parseFloat(this.targetAttendanceRate) || 0,
        actual: parseFloat(attendanceRate.toFixed(2)),
        percentage: this.targetAttendanceRate > 0 ? 
          (attendanceRate / this.targetAttendanceRate) * 100 : 0
      }
    };
  };

  // Class methods
  YearlyGoals.getCurrentYearGoals = async function() {
    const currentYear = new Date().getFullYear();
    return YearlyGoals.findOne({
      where: { year: currentYear },
      include: [
        {
          model: sequelize.models.AuthUser,
          as: 'creator',
          attributes: ['fullName', 'role']
        },
        {
          model: sequelize.models.AuthUser,
          as: 'approver',
          attributes: ['fullName', 'role']
        }
      ]
    });
  };

  YearlyGoals.getGoalsByYear = function(year) {
    return YearlyGoals.findOne({
      where: { year },
      include: [
        {
          model: sequelize.models.AuthUser,
          as: 'creator',
          attributes: ['fullName', 'role']
        },
        {
          model: sequelize.models.AuthUser,
          as: 'approver',
          attributes: ['fullName', 'role']
        }
      ]
    });
  };

  YearlyGoals.getAllGoals = function() {
    return YearlyGoals.findAll({
      include: [
        {
          model: sequelize.models.AuthUser,
          as: 'creator',
          attributes: ['fullName', 'role']
        },
        {
          model: sequelize.models.AuthUser,
          as: 'approver',
          attributes: ['fullName', 'role']
        }
      ],
      order: [['year', 'DESC']]
    });
  };

  return YearlyGoals;
};