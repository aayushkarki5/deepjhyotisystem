const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
const auth = require('../middleware/auth');

router.post('/', auth, inventoryController.addInventory);
router.get('/', auth, inventoryController.getInventory);
router.put('/:id', auth, inventoryController.updateInventory);
router.delete('/:id', auth, inventoryController.deleteInventory);

module.exports = router;
