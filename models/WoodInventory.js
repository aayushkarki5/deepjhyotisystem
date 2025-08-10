// ===== models/WoodInventory.js =====
module.exports = (sequelize, DataTypes) => {
  const { Op } = sequelize;  // Import Op at the top

  const WoodInventory = sequelize.define('WoodInventory', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    woodType: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 100]
      }
    },
    species: {
      type: DataTypes.STRING,
      allowNull: true
    },
    size: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 50]
      }
    },
    unit: {
      type: DataTypes.ENUM('pieces', 'cubic_feet', 'cubic_meter', 'bundle', 'ton'),
      defaultValue: 'pieces',
      allowNull: false
    },
    quantityAvailable: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0
      }
    },
    quantityAllocated: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0
      }
    },
    quantityDistributed: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0
      }
    },
    pricePerUnit: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      validate: {
        min: 0
      }
    },
    arrivalDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    expiryDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    source: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Where the wood came from'
    },
    quality: {
      type: DataTypes.ENUM('Premium', 'Standard', 'Basic', 'Damaged'),
      defaultValue: 'Standard',
      allowNull: false
    },
    location: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Storage location in the forest'
    },
    minimumThreshold: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 10,
      allowNull: false,
      comment: 'Minimum quantity before reorder alert'
    },
    status: {
      type: DataTypes.ENUM('Available', 'Low Stock', 'Out of Stock', 'Reserved', 'Expired'),
      defaultValue: 'Available',
      allowNull: false
    },
    addedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'auth_users',
        key: 'id'
      }
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'wood_inventory',
    timestamps: true,
    indexes: [
      {
        fields: ['woodType', 'size']
      },
      {
        fields: ['status']
      },
      {
        fields: ['quality']
      },
      {
        fields: ['arrivalDate']
      },
      {
        fields: ['quantityAvailable']
      }
    ],
    hooks: {
      beforeSave: (inventory, options) => {
        // Auto-update status based on quantity
        const available = parseFloat(inventory.quantityAvailable);
        const threshold = parseFloat(inventory.minimumThreshold);
        
        if (available <= 0) {
          inventory.status = 'Out of Stock';
        } else if (available <= threshold) {
          inventory.status = 'Low Stock';
        } else if (inventory.status === 'Out of Stock' || inventory.status === 'Low Stock') {
          inventory.status = 'Available';
        }

        // Check if expired
        if (inventory.expiryDate && inventory.expiryDate <= new Date()) {
          inventory.status = 'Expired';
        }
      }
    }
  });

  WoodInventory.associate = (models) => {
    // WoodInventory has many distributions
    WoodInventory.hasMany(models.WoodDistribution, {
      foreignKey: 'inventoryId',
      as: 'distributions'
    });

    // WoodInventory added by AuthUser
    WoodInventory.belongsTo(models.AuthUser, {
      foreignKey: 'addedBy',
      as: 'creator'
    });
  };

  // Instance methods
  WoodInventory.prototype.updateQuantity = function(quantityChange, type = 'distribute') {
    if (type === 'distribute' || type === 'allocate') {
      this.quantityAvailable = Math.max(0, this.quantityAvailable - Math.abs(quantityChange));
      if (type === 'distribute') {
        this.quantityDistributed += Math.abs(quantityChange);
      } else {
        this.quantityAllocated += Math.abs(quantityChange);
      }
    } else if (type === 'add') {
      this.quantityAvailable += Math.abs(quantityChange);
    } else if (type === 'return') {
      this.quantityAvailable += Math.abs(quantityChange);
      this.quantityDistributed = Math.max(0, this.quantityDistributed - Math.abs(quantityChange));
    }

    return this.save();
  };

  WoodInventory.prototype.isLowStock = function() {
    return this.quantityAvailable <= this.minimumThreshold;
  };

  WoodInventory.prototype.isOutOfStock = function() {
    return this.quantityAvailable <= 0;
  };

  WoodInventory.prototype.getRemainingQuantity = function() {
    return this.quantityAvailable - this.quantityAllocated;
  };

  // Class methods
  WoodInventory.getInventorySummary = async function() {
    const summary = await WoodInventory.findAll({
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalItems'],
        [sequelize.fn('SUM', sequelize.col('quantityAvailable')), 'totalQuantity'],
        [sequelize.fn('SUM', sequelize.col('quantityDistributed')), 'totalDistributed'],
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'statusCount']
      ],
      group: ['status'],
      raw: true
    });

    const totalSummary = await WoodInventory.findAll({
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalItems'],
        [sequelize.fn('SUM', sequelize.col('quantityAvailable')), 'totalQuantity'],
        [sequelize.fn('SUM', sequelize.col('quantityDistributed')), 'totalDistributed'],
        [sequelize.fn('SUM', sequelize.col('quantityAllocated')), 'totalAllocated']
      ],
      raw: true
    });

    return {
      total: totalSummary[0] || {},
      byStatus: summary || []
    };
  };

  WoodInventory.getLowStockItems = async function() {
    return WoodInventory.findAll({
      where: {
        [Op.or]: [
          { status: 'Low Stock' },
          { status: 'Out of Stock' },
          sequelize.where(
            sequelize.col('quantityAvailable'),
            '<=',
            sequelize.col('minimumThreshold')
          )
        ]
      },
      order: [['quantityAvailable', 'ASC']]
    });
  };

  WoodInventory.getWoodTypeStats = async function() {
    return WoodInventory.findAll({
      attributes: [
        'woodType',
        [sequelize.fn('COUNT', sequelize.col('id')), 'itemCount'],
        [sequelize.fn('SUM', sequelize.col('quantityAvailable')), 'totalQuantity'],
        [sequelize.fn('SUM', sequelize.col('quantityDistributed')), 'totalDistributed']
      ],
      group: ['woodType'],
      order: [['woodType', 'ASC']],
      raw: true
    });
  };

  WoodInventory.findByTypeAndSize = function(woodType, size) {
    return WoodInventory.findOne({
      where: { woodType, size, status: 'Available' },
      order: [['arrivalDate', 'ASC']] // FIFO - First In, First Out
    });
  };

  WoodInventory.getExpiringItems = async function(days = 30) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    return WoodInventory.findAll({
      where: {
        expiryDate: {
          [Op.lte]: futureDate,
          [Op.gte]: new Date()
        },
        status: {
          [Op.ne]: 'Expired'
        }
      },
      order: [['expiryDate', 'ASC']]
    });
  };

    return WoodInventory;
  };