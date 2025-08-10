// ✅ Added Op import
const { Op } = require('sequelize');
const WoodInventory = require('../models/WoodInventory');

exports.addInventory = async (req, res) => {
    try {
        const { woodType, size, quantityAvailable, arrivalDate } = req.body;

        if (!woodType || !quantityAvailable) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const inventory = await WoodInventory.create({
            wood_type: woodType,
            size,
            quantity_available: quantityAvailable,
            arrival_date: arrivalDate
        });

        res.status(201).json(inventory);
    } catch (error) {
        console.error('Error adding inventory:', error);
        res.status(500).json({ message: 'Error adding inventory' });
    }
};

exports.getInventory = async (req, res) => {
    try {
        const inventory = await WoodInventory.findAll({
            order: [['created_at', 'DESC']]
        });
        res.json(inventory);
    } catch (error) {
        console.error('Error fetching inventory:', error);
        res.status(500).json({ message: 'Error fetching inventory' });
    }
};

exports.updateInventory = async (req, res) => {
    try {
        const { id } = req.params;
        const { woodType, size, quantityAvailable, arrivalDate } = req.body;

        const inventory = await WoodInventory.findByPk(id);
        if (!inventory) {
            return res.status(404).json({ message: 'Inventory not found' });
        }

        inventory.wood_type = woodType || inventory.wood_type;
        inventory.size = size || inventory.size;
        inventory.quantity_available = quantityAvailable ?? inventory.quantity_available;
        inventory.arrival_date = arrivalDate || inventory.arrival_date;

        await inventory.save();
        res.json(inventory);
    } catch (error) {
        console.error('Error updating inventory:', error);
        res.status(500).json({ message: 'Error updating inventory' });
    }
};

exports.deleteInventory = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await WoodInventory.destroy({ where: { id } });

        if (!deleted) {
            return res.status(404).json({ message: 'Inventory not found' });
        }

        res.json({ message: 'Inventory deleted successfully' });
    } catch (error) {
        console.error('Error deleting inventory:', error);
        res.status(500).json({ message: 'Error deleting inventory' });
    }
};
