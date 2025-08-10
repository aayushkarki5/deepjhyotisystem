const express = require('express');
const router = express.Router();
const distributionController = require('../controllers/distributionController');
const auth = require('../middleware/auth');

router.post('/', auth, distributionController.addDistribution);
router.get('/', auth, distributionController.getDistributions);
router.put('/:id', auth, distributionController.updateDistribution);
router.delete('/:id', auth, distributionController.deleteDistribution);

module.exports = router;
