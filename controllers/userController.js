// ✅ Added Op import
const { Op } = require('sequelize');
const User = require('../models/User');

exports.createUser = async (req, res) => {
    try {
        const { cardNumber, fullName, grandfatherName, familyDetails, email, phone, status, category } = req.body;

        const existing = await User.findOne({
            where: {
                [Op.or]: [
                    { card_number: cardNumber },
                    { email }
                ]
            }
        });

        if (existing) {
            return res.status(400).json({ message: 'User with given card number or email already exists' });
        }

        const photoUrl = req.file ? `/uploads/user-photos/${req.file.filename}` : null;

        const user = await User.create({
            card_number: cardNumber,
            full_name: fullName,
            grandfather_name: grandfatherName,
            family_details: familyDetails,
            photo_url: photoUrl,
            email,
            phone,
            status,
            category
        });

        res.status(201).json(user);
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ message: 'Error creating user' });
    }
};

exports.getUsers = async (req, res) => {
    try {
        const users = await User.findAll({ order: [['created_at', 'DESC']] });
        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Error fetching users' });
    }
};

exports.updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { fullName, grandfatherName, familyDetails, email, phone, status, category } = req.body;

        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (req.file) {
            user.photo_url = `/uploads/user-photos/${req.file.filename}`;
        }

        user.full_name = fullName || user.full_name;
        user.grandfather_name = grandfatherName || user.grandfather_name;
        user.family_details = familyDetails || user.family_details;
        user.email = email || user.email;
        user.phone = phone || user.phone;
        user.status = status || user.status;
        user.category = category || user.category;

        await user.save();
        res.json(user);
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ message: 'Error updating user' });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await User.destroy({ where: { id } });

        if (!deleted) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ message: 'Error deleting user' });
    }
};
