// ✅ Added Op import
const { Op } = require('sequelize');
const OfficeTeam = require('../models/OfficeTeam');

exports.addTeamMember = async (req, res) => {
    try {
        const { name, role, contactInfo, isActive } = req.body;

        if (!name || !role) {
            return res.status(400).json({ message: 'Name and role are required' });
        }

        const member = await OfficeTeam.create({
            name,
            role,
            contact_info: contactInfo,
            is_active: isActive ?? true
        });

        res.status(201).json(member);
    } catch (error) {
        console.error('Error adding team member:', error);
        res.status(500).json({ message: 'Error adding team member' });
    }
};

exports.getTeam = async (req, res) => {
    try {
        const team = await OfficeTeam.findAll({ order: [['created_at', 'DESC']] });
        res.json(team);
    } catch (error) {
        console.error('Error fetching team:', error);
        res.status(500).json({ message: 'Error fetching team' });
    }
};

exports.updateTeamMember = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, role, contactInfo, isActive } = req.body;

        const member = await OfficeTeam.findByPk(id);
        if (!member) {
            return res.status(404).json({ message: 'Team member not found' });
        }

        member.name = name || member.name;
        member.role = role || member.role;
        member.contact_info = contactInfo || member.contact_info;
        member.is_active = isActive ?? member.is_active;

        await member.save();
        res.json(member);
    } catch (error) {
        console.error('Error updating team member:', error);
        res.status(500).json({ message: 'Error updating team member' });
    }
};

exports.deleteTeamMember = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await OfficeTeam.destroy({ where: { id } });

        if (!deleted) {
            return res.status(404).json({ message: 'Team member not found' });
        }

        res.json({ message: 'Team member deleted successfully' });
    } catch (error) {
        console.error('Error deleting team member:', error);
        res.status(500).json({ message: 'Error deleting team member' });
    }
};
