const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');

router.post('/', auth, upload.single('photo'), userController.createUser);
router.get('/', auth, userController.getUsers);
router.put('/:id', auth, upload.single('photo'), userController.updateUser);
router.delete('/:id', auth, userController.deleteUser);

module.exports = router;
