const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const auth = require('../middleware/auth');

router.post('/', auth, attendanceController.recordAttendance);
router.get('/', auth, attendanceController.getAttendance);
router.put('/:id', auth, attendanceController.updateAttendance);
router.delete('/:id', auth, attendanceController.deleteAttendance);

module.exports = router;
