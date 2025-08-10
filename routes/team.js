const express = require('express');
const router = express.Router();
const teamController = require('../controllers/teamController');
const auth = require('../middleware/auth');

router.post('/', auth, teamController.addTeamMember);
router.get('/', auth, teamController.getTeam);
router.put('/:id', auth, teamController.updateTeamMember);
router.delete('/:id', auth, teamController.deleteTeamMember);

module.exports = router;
