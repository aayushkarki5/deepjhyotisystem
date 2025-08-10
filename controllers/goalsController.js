// ✅ Added Op import
const { Op } = require('sequelize');
const YearlyGoals = require('../models/YearlyGoals');

exports.createGoal = async (req, res) => {
    try {
        const { year, goalType, targetValue, description } = req.body;

        const goal = await YearlyGoals.create({
            year,
            goal_type: goalType,
            target_value: targetValue,
            description,
            created_by: req.user.id
        });

        res.status(201).json(goal);
    } catch (error) {
        console.error('Error creating yearly goal:', error);
        res.status(500).json({ message: 'Error creating yearly goal' });
    }
};

exports.getGoals = async (req, res) => {
    try {
        const goals = await YearlyGoals.findAll({ order: [['year', 'DESC']] });
        res.json(goals);
    } catch (error) {
        console.error('Error fetching goals:', error);
        res.status(500).json({ message: 'Error fetching goals' });
    }
};
