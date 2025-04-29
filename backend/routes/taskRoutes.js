const express = require('express');
const router = express.Router();
const { addTask, getTasks, updateTaskStatus } = require('../controllers/taskController');

router.post('/add', addTask);
router.get('/all', getTasks);
router.put('/update/:taskId', updateTaskStatus);

module.exports = router;
