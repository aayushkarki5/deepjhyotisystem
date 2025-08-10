// ===== models/WoodDistribution.js =====
module.exports = (sequelize, DataTypes) => {
  const WoodDistribution = sequelize.define('WoodDistribution', {
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
    inventoryId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'wood_inventory',
        key: 'id'
      }
    },
    distributionDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    woodType: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Snapshot from inventory at time of distribution'
    },
    woodSize: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Snapshot from inventory at time of distribution'
    },
    quantity: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0.01
      }
    },
    unit: {
      type: DataTypes.ENUM('pieces', 'cubic_feet', 'cubic_meter', 'bundle', 'ton'),
      defaultValue: 'pieces',
      allowNull: false
    },
    pricePerUnit: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      validate: {
        min: 0
      }
    },
    totalPrice: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      validate: {
        min: 0
      }
    },
    purpose: {
      type: DataTypes.ENUM('Personal Use', 'Construction', 'Fuel', 'Sale', 'Community Project', 'Other'),
      defaultValue: 'Personal Use',
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('Approved', 'Pending', 'Delivered', 'Cancelled', 'Returned'),
      defaultValue: 'Pending',
      allowNull: false
    },
    approvedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'auth_users',
        key: 'id'
      }
    },
    distributedBy: {
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
    deliveryDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    returnDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    requestNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Notes from the user requesting wood'
    },
    approvalNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Notes from the approver'
    },
    distributionNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Notes during distribution'
    },
    paymentStatus: {
      type: DataTypes.ENUM('Paid', 'Unpaid', 'Partial', 'Not Required'),
      defaultValue: 'Not Required',
      allowNull: false
    },
    paymentMethod: {
      type: DataTypes.ENUM('Cash', 'Bank Transfer', 'Cheque', 'Work Exchange', 'Free'),
      allowNull: true
    },
    receiptNumber: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true
    }
  }, {
    tableName: 'wood_distributions',
    timestamps: true,
    indexes: [
      {
        fields: ['userId', 'distributionDate']
      },
      {
        fields: ['inventoryId']
      },
      {
        fields: ['status']
      },
      {
        fields: ['distributionDate']
      },
      {
        fields: ['purpose']
      },
      {
        fields: ['paymentStatus']
      },
      {
        unique: true,
        fields: ['receiptNumber']
      }
    ],
    hooks: {
      beforeSave: (distribution, options) => {
        // Calculate total price if price per unit is provided
        if (distribution.pricePerUnit && distribution.quantity) {
          distribution.totalPrice = distribution.pricePerUnit * distribution.quantity;
        }

        // Set approved date when status changes to approved
        if (distribution.changed('status') && distribution.status === 'Approved' && !distribution.approvedDate) {
          distribution.approvedDate = new Date();
        }

        // Set delivery date when status changes to delivered
        if (distribution.changed('status') && distribution.status === 'Delivered' && !distribution.deliveryDate) {
          distribution.deliveryDate = new Date();
        }

        // Set return date when status changes to returned
        if (distribution.changed('status') && distribution.status === 'Returned' && !distribution.returnDate) {
          distribution.returnDate = new Date();
        }
      },
      afterUpdate: async (distribution, options) => {
        // Update inventory quantities when status changes
        if (distribution.changed('status')) {
          const WoodInventory = sequelize.models.WoodInventory;
          const inventory = await WoodInventory.findByPk(distribution.inventoryId);

          if (inventory) {
            if (distribution.status === 'Delivered' && distribution.previous('status') === 'Approved') {
              // Move from allocated to distributed
              inventory.quantityAllocated = Math.max(0, inventory.quantityAllocated - distribution.quantity);
              inventory.quantityDistributed += distribution.quantity;
              await inventory.save();
            } else if (distribution.status === 'Returned') {
              // Return to available stock
              inventory.quantityAvailable += distribution.quantity;
              inventory.quantityDistributed = Math.max(0, inventory.quantityDistributed - distribution.quantity);
              await inventory.save();
            } else if (distribution.status === 'Cancelled') {
              // Return to available from allocated
              if (distribution.previous('status') === 'Approved') {
                inventory.quantityAvailable += distribution.quantity;
                inventory.quantityAllocated = Math.max(0, inventory.quantityAllocated - distribution.quantity);
                await inventory.save();
              }
            }
          }
        }
      }
    }
  });

  WoodDistribution.associate = (models) => {
    // WoodDistribution belongs to a User
    WoodDistribution.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });

    // WoodDistribution belongs to WoodInventory
    WoodDistribution.belongsTo(models.WoodInventory, {
      foreignKey: 'inventoryId',
      as: 'inventory'
    });

    // WoodDistribution approved by AuthUser
    WoodDistribution.belongsTo(models.AuthUser, {
      foreignKey: 'approvedBy',
      as: 'approver'
    });

    // WoodDistribution distributed by AuthUser
    WoodDistribution.belongsTo(models.AuthUser, {
      foreignKey: 'distributedBy',
      as: 'distributor'
    });
  };

  // Instance methods
  WoodDistribution.prototype.approve = function(approvedBy, notes = null) {
    this.status = 'Approved';
    this.approvedBy = approvedBy;
    this.approvedDate = new Date();
    if (notes) this.approvalNotes = notes;
    return this.save();
  };

  WoodDistribution.prototype.deliver = function(distributedBy, notes = null) {
    this.status = 'Delivered';
    this.distributedBy = distributedBy;
    this.deliveryDate = new Date();
    if (notes) this.distributionNotes = notes;
    return this.save();
  };

  WoodDistribution.prototype.cancel = function(notes = null) {
    this.status = 'Cancelled';
    if (notes) this.approvalNotes = notes;
    return this.save();
  };

  WoodDistribution.prototype.markReturned = function(notes = null) {
    this.status = 'Returned';
    this.returnDate = new Date();
    if (notes) this.distributionNotes = notes;
    return this.save();
  };

  WoodDistribution.prototype.generateReceiptNumber = function() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    
    this.receiptNumber = `DFG-${year}${month}${day}-${random}`;
    return this.save();
  };

  // Class methods
  WoodDistribution.getDistributionStats = async function(startDate = null, endDate = null) {
    const whereClause = {};
    if (startDate && endDate) {
      whereClause.distributionDate = {
        [sequelize.Op.between]: [startDate, endDate]
      };
    }

    const stats = await WoodDistribution.findAll({
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('SUM', sequelize.col('quantity')), 'totalQuantity'],
        [sequelize.fn('SUM', sequelize.col('totalPrice')), 'totalValue']
      ],
      where: whereClause,
      group: ['status'],
      raw: true
    });

    return stats.reduce((acc, stat) => {
      acc[stat.status] = {
        count: parseInt(stat.count),
        quantity: parseFloat(stat.totalQuantity) || 0,
        value: parseFloat(stat.totalValue) || 0
      };
      return acc;
    }, {});
  };

  WoodDistribution.getUserDistributionHistory = async function(userId, limit = 50) {
    return WoodDistribution.findAll({
      where: { userId },
      include: [
        {
          model: sequelize.models.WoodInventory,
          as: 'inventory',
          attributes: ['woodType', 'size', 'quality']
        },
        {
          model: sequelize.models.AuthUser,
          as: 'approver',
          attributes: ['fullName', 'role']
        }
      ],
      order: [['distributionDate', 'DESC']],
      limit
    });
  };

  WoodDistribution.getMonthlyDistribution = async function(year, month) {
    return WoodDistribution.findAll({
      where: sequelize.where(
        sequelize.fn('EXTRACT', sequelize.literal('YEAR FROM "distributionDate"')), year
      ) && sequelize.where(
        sequelize.fn('EXTRACT', sequelize.literal('MONTH FROM "distributionDate"')), month
      ),
      include: [
        {
          model: sequelize.models.User,
          as: 'user',
          attributes: ['fullName', 'cardNumber', 'category']
        },
        {
          model: sequelize.models.WoodInventory,
          as: 'inventory',
          attributes: ['woodType', 'size']
        }
      ],
      order: [['distributionDate', 'DESC']]
    });
  };

  WoodDistribution.getPendingDistributions = async function() {
    return WoodDistribution.findAll({
      where: { status: 'Pending' },
      include: [
        {
          model: sequelize.models.User,
          as: 'user',
          attributes: ['fullName', 'cardNumber', 'category', 'contactNumber']
        },
        {
          model: sequelize.models.WoodInventory,
          as: 'inventory',
          attributes: ['woodType', 'size', 'quantityAvailable']
        }
      ],
      order: [['distributionDate', 'ASC']]
    });
  };

  return WoodDistribution;
};