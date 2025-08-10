// ✅ Added Op import
const { Op } = require('sequelize');
const WoodDistribution = require('../models/WoodDistribution');
const WoodInventory = require('../models/WoodInventory');
const User = require('../models/User');

exports.recordDistribution = async (req, res) => {
    try {
        const { userId, inventoryId, quantity, notes } = req.body;

        if (!userId || !inventoryId || !quantity) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const inventory = await WoodInventory.findByPk(inventoryId);
        if (!inventory) {
            return res.status(404).json({ message: 'Inventory not found' });
        }

        if (inventory.quantity_available < quantity) {
            return res.status(400).json({ message: 'Insufficient stock' });
        }

        const distribution = await WoodDistribution.create({
            user_id: userId,
            wood_inventory_id: inventoryId,
            quantity_distributed: quantity,
            distributed_by: req.user.id,
            notes
        });

        inventory.quantity_available -= quantity;
        await inventory.save();

        res.status(201).json(distribution);
    } catch (error) {
        console.error('Error recording distribution:', error);
        res.status(500).json({ message: 'Error recording distribution' });
    }
};

exports.getAllDistributions = async (req, res) => {
    try {
        const records = await WoodDistribution.findAll({
            include: [
                { model: User, attributes: ['full_name', 'card_number'] },
                { model: WoodInventory, attributes: ['wood_type', 'size'] }
            ],
            order: [['distribution_date', 'DESC']]
        });

        res.json(records);
    } catch (error) {
        console.error('Error fetching distributions:', error);
        res.status(500).json({ message: 'Error fetching distributions' });
    }
};
