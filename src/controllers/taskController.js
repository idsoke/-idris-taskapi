const {
  createTask,
  listTasksByUser,
  findTaskById,
  updateTask,
  deleteTask,
} = require('../models/taskModel');

const VALID_STATUSES = ['pending', 'in_progress', 'done'];

async function create(req, res) {
  const { title, description } = req.body;
  if (!title) {
    return res.status(400).json({ error: 'title is required' });
  }

  const task = await createTask({ userId: req.user.id, title, description });
  res.status(201).json(task);
}

async function list(req, res) {
  const { status } = req.query;
  if (status && !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` });
  }

  const tasks = await listTasksByUser(req.user.id, { status });
  res.json(tasks);
}

async function getOne(req, res) {
  const task = await findTaskById(req.params.id, req.user.id);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  res.json(task);
}

async function update(req, res) {
  const { title, description, status } = req.body;
  if (status && !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` });
  }

  const task = await updateTask(req.params.id, req.user.id, { title, description, status });
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  res.json(task);
}

async function remove(req, res) {
  const deleted = await deleteTask(req.params.id, req.user.id);
  if (!deleted) {
    return res.status(404).json({ error: 'Task not found' });
  }
  res.status(204).send();
}

module.exports = { create, list, getOne, update, remove };
