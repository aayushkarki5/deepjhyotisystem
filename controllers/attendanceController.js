// ✅ Added Op import
const { Op } = require('sequelize');
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const AuthUser = require('../models/AuthUser');

// Record attendance
exports.recordAttendance = async (req, res) => {
    try {
        const { userId, attendanceDate, monthYear } = req.body;

        // Validate required fields
        if (!userId || !attendanceDate || !monthYear) {
            return res.status(400).json({ message: 'Missing required fields.' });
        }

        // Check if user exists
        const userExists = await User.findByPk(userId);
        if (!userExists) {
            return res.status(404).json({ message: 'User not found.' });
        }

        // Prevent duplicate attendance for the same month/year
        const existing = await Attendance.findOne({
            where: {
                user_id: userId,
                month_year: monthYear
            }
        });

        if (existing) {
            return res.status(400).json({ message: 'Attendance already recorded for this month.' });
        }

        const attendance = await Attendance.create({
            user_id: userId,
            attendance_date: attendanceDate,
            month_year: monthYear,
            recorded_by: req.user.id
        });

        res.status(201).json(attendance);
    } catch (error) {
        console.error('Error recording attendance:', error);
        res.status(500).json({ message: 'Error recording attendance' });
    }
};

// Get all attendance records
exports.getAllAttendance = async (req, res) => {
    try {
        const records = await Attendance.findAll({
            include: [
                { model: User, attributes: ['full_name', 'card_number'] },
                { model: AuthUser, attributes: ['email'] }
            ],
            order: [['attendance_date', 'DESC']]
        });

        res.json(records);
    } catch (error) {
        console.error('Error fetching attendance records:', error);
        res.status(500).json({ message: 'Error fetching attendance records' });
    }
};

// Get attendance by month/year
exports.getAttendanceByMonth = async (req, res) => {
    try {
        const { monthYear } = req.params;

        const records = await Attendance.findAll({
            where: { month_year: monthYear },
            include: [{ model: User, attributes: ['full_name', 'card_number'] }]
        });

        res.json(records);
    } catch (error) {
        console.error('Error fetching attendance by month:', error);
        res.status(500).json({ message: 'Error fetching attendance by month' });
    }
};

// Delete attendance
exports.deleteAttendance = async (req, res) => {
    try {
        const { id } = req.params;

        const deleted = await Attendance.destroy({ where: { id } });

        if (!deleted) {
            return res.status(404).json({ message: 'Attendance not found.' });
        }

        res.json({ message: 'Attendance deleted successfully.' });
    } catch (error) {
        console.error('Error deleting attendance:', error);
        res.status(500).json({ message: 'Error deleting attendance' });
    }
};
