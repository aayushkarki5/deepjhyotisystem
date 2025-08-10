// ===== models/OfficeTeam.js =====
module.exports = (sequelize, DataTypes) => {
  const { Op } = sequelize;  // Import Op at the top

  const OfficeTeam = sequelize.define('OfficeTeam', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    fullName: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 100]
      }
    },
    position: {
      type: DataTypes.ENUM(
        'Chairman', 
        'Vice Chairman', 
        'Secretary', 
        'Treasurer', 
        'Member', 
        'Advisor',
        'Forest Officer',
        'Technical Officer',
        'Community Liaison'
      ),
      allowNull: false
    },
    department: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: 'Administration'
    },
    contactNumber: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isNumeric: true,
        len: [10, 15]
      }
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isEmail: true
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
    terminatedDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    photo: {
      type: DataTypes.STRING,
      allowNull: true
    },
    qualifications: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Educational qualifications and certifications'
    },
    experience: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Work experience details'
    },
    responsibilities: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Key responsibilities and duties'
    },
    salary: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      validate: {
        min: 0
      }
    },
    allowances: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0,
      validate: {
        min: 0
      }
    },
    status: {
      type: DataTypes.ENUM('Active', 'Inactive', 'On Leave', 'Terminated'),
      defaultValue: 'Active',
      allowNull: false
    },
    employeeId: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: true
    },
    emergencyContactName: {
      type: DataTypes.STRING,
      allowNull: true
    },
    emergencyContactNumber: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isNumeric: true,
        len: [10, 15]
      }
    },
    emergencyContactRelation: {
      type: DataTypes.STRING,
      allowNull: true
    },
    bankAccountNumber: {
      type: DataTypes.STRING,
      allowNull: true
    },
    bankName: {
      type: DataTypes.STRING,
      allowNull: true
    },
    panNumber: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true
    },
    citizenshipNumber: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    addedBy: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'auth_users',
        key: 'id'
      }
    },
    lastUpdatedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'auth_users',
        key: 'id'
      }
    }
  }, {
    tableName: 'office_team',
    timestamps: true,
    paranoid: true, // Enables soft delete
    indexes: [
      {
        fields: ['position']
      },
      {
        fields: ['status']
      },
      {
        fields: ['fullName']
      },
      {
        fields: ['department']
      }
    ],
    hooks: {
      beforeCreate: (member, options) => {
        // Auto-generate employee ID if not provided
        if (!member.employeeId) {
          const year = new Date().getFullYear();
          const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
          member.employeeId = `DFG-${year}-${randomNum}`;
        }
      },
      beforeUpdate: (member, options) => {
        // Set terminated date when status changes to Terminated
        if (member.changed('status') && member.status === 'Terminated' && !member.terminatedDate) {
          member.terminatedDate = new Date();
        }
      }
    }
  });

  OfficeTeam.associate = (models) => {
    // OfficeTeam added by AuthUser
    OfficeTeam.belongsTo(models.AuthUser, {
      foreignKey: 'addedBy',
      as: 'creator'
    });

    // OfficeTeam last updated by AuthUser
    OfficeTeam.belongsTo(models.AuthUser, {
      foreignKey: 'lastUpdatedBy',
      as: 'updater'
    });

    // OfficeTeam might be linked to AuthUser (if they have login access)
    OfficeTeam.hasOne(models.AuthUser, {
      foreignKey: 'teamMemberId',
      as: 'authAccount'
    });
  };

  // Instance methods
  OfficeTeam.prototype.activate = function() {
    this.status = 'Active';
    this.terminatedDate = null;
    return this.save();
  };

  OfficeTeam.prototype.deactivate = function() {
    this.status = 'Inactive';
    return this.save();
  };

  OfficeTeam.prototype.terminate = function(notes = null) {
    this.status = 'Terminated';
    this.terminatedDate = new Date();
    if (notes) this.notes = notes;
    return this.save();
  };

  OfficeTeam.prototype.setOnLeave = function() {
    this.status = 'On Leave';
    return this.save();
  };

  OfficeTeam.prototype.getTotalCompensation = function() {
    const salary = parseFloat(this.salary) || 0;
    const allowances = parseFloat(this.allowances) || 0;
    return salary + allowances;
  };

  OfficeTeam.prototype.getServiceDuration = function() {
    const startDate = this.joinedDate;
    const endDate = this.terminatedDate || new Date();
    const diffTime = Math.abs(endDate - startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const years = Math.floor(diffDays / 365);
    const months = Math.floor((diffDays % 365) / 30);
    
    return {
      days: diffDays,
      years,
      months,
      display: `${years} years, ${months} months`
    };
  };

  OfficeTeam.prototype.toJSON = function() {
    const values = Object.assign({}, this.get());
    delete values.salary;
    delete values.bankAccountNumber;
    delete values.panNumber;
    delete values.citizenshipNumber;
    return values;
  };

  // Class methods
  OfficeTeam.getTeamByPosition = function(position) {
    return OfficeTeam.findAll({
      where: { 
        position, 
        status: 'Active' 
      },
      order: [['joinedDate', 'ASC']]
    });
  };

  OfficeTeam.getActiveTeam = function() {
    return OfficeTeam.findAll({
      where: { status: 'Active' },
      order: [
        ['position', 'ASC'],
        ['joinedDate', 'ASC']
      ],
      include: [
        {
          model: sequelize.models.AuthUser,
          as: 'creator',
          attributes: ['fullName']
        }
      ]
    });
  };

  OfficeTeam.getTeamStats = async function() {
    const stats = await OfficeTeam.findAll({
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['status'],
      raw: true
    });

    const positionStats = await OfficeTeam.findAll({
      attributes: [
        'position',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where: { status: 'Active' },
      group: ['position'],
      raw: true
    });

    const totalSalary = await OfficeTeam.sum('salary', {
      where: { status: 'Active' }
    }) || 0;

    const totalAllowances = await OfficeTeam.sum('allowances', {
      where: { status: 'Active' }
    }) || 0;

    return {
      byStatus: stats.reduce((acc, stat) => {
        acc[stat.status] = parseInt(stat.count);
        return acc;
      }, {}),
      byPosition: positionStats.reduce((acc, stat) => {
        acc[stat.position] = parseInt(stat.count);
        return acc;
      }, {}),
      financials: {
        totalSalary: parseFloat(totalSalary),
        totalAllowances: parseFloat(totalAllowances),
        totalCompensation: parseFloat(totalSalary) + parseFloat(totalAllowances)
      }
    };
  };

  OfficeTeam.findByEmployeeId = function(employeeId) {
    return OfficeTeam.findOne({
      where: { employeeId }
    });
  };

  OfficeTeam.getTeamHierarchy = async function() {
    const positions = [
      'Chairman',
      'Vice Chairman', 
      'Secretary',
      'Treasurer',
      'Forest Officer',
      'Technical Officer',
      'Community Liaison',
      'Advisor',
      'Member'
    ];

    const hierarchy = {};
    
    for (const position of positions) {
      const members = await OfficeTeam.findAll({
        where: { 
          position, 
          status: 'Active' 
        },
        attributes: ['fullName', 'contactNumber', 'email', 'joinedDate'],
        order: [['joinedDate', 'ASC']]
      });
      
      if (members.length > 0) {
        hierarchy[position] = members;
      }
    }

    return hierarchy;
  };

  OfficeTeam.getUpcomingRetirements = async function(months = 6) {
    // Assuming retirement age is 60
    const retirementAge = 60;
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + months);

    return OfficeTeam.findAll({
      where: {
        status: 'Active',
        dateOfBirth: {
          [Op.ne]: null
        }
      }
    }).then(members => {
      return members.filter(member => {
        if (!member.dateOfBirth) return false;
        
        const birthDate = new Date(member.dateOfBirth);
        const retirementDate = new Date(birthDate);
        retirementDate.setFullYear(retirementDate.getFullYear() + retirementAge);
        
        return retirementDate <= futureDate && retirementDate >= new Date();
      }).map(member => ({
        ...member.toJSON(),
        retirementDate: (() => {
          const birthDate = new Date(member.dateOfBirth);
          const retirementDate = new Date(birthDate);
          retirementDate.setFullYear(retirementDate.getFullYear() + retirementAge);
          return retirementDate;
        })()
      }));
    });
  };

  return OfficeTeam;
};