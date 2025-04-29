const Task = require('../models/Task');

exports.addTask = async (req, res) => {
  const { userId, description, date, time, status } = req.body;

  try {
    const task = new Task({ userId, description, date, time, status });
    await task.save();
    res.status(201).json({ message: 'Task added successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getTasks = async (req, res) => {
  const { userId } = req.query;

  try {
    const tasks = await Task.find({ userId });
    res.status(200).json(tasks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateTaskStatus = async (req, res) => {
  const { taskId } = req.params;
  const { status } = req.body;

  try {
    await Task.findByIdAndUpdate(taskId, { status });
    res.status(200).json({ message: 'Task status updated' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
