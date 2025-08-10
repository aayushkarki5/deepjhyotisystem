// ✅ Added Op import
const { Op } = require('sequelize');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const WoodInventory = require('../models/WoodInventory');
const WoodDistribution = require('../models/WoodDistribution');
const YearlyGoals = require('../models/YearlyGoals');

exports.getDashboardStats = async (req, res) => {
    try {
        const totalUsers = await User.count();
        const activeUsers = await User.count({ where: { status: 'active' } });
        const passiveUsers = await User.count({ where: { status: 'passive' } });

        const totalAttendance = await Attendance.count();
        const totalWood = await WoodInventory.sum('quantity_available') || 0;
        const totalDistributed = await WoodDistribution.sum('quantity_distributed') || 0;

        const goals = await YearlyGoals.findAll({
            order: [['year', 'DESC']],
            limit: 5
        });

        res.json({
            totalUsers,
            activeUsers,
            passiveUsers,
            totalAttendance,
            totalWood,
            totalDistributed,
            goals
        });
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({ message: 'Error fetching dashboard stats' });
    }
};
