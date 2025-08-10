const express = require('express');
const router = express.Router();
const goalsController = require('../controllers/goalsController');
const auth = require('../middleware/auth');

router.post('/', auth, goalsController.addGoal);
router.get('/', auth, goalsController.getGoals);
router.put('/:id', auth, goalsController.updateGoal);
router.delete('/:id', auth, goalsController.deleteGoal);

module.exports = router;
