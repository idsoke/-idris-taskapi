const {
  createTask,
  listTasksByUser,
  findTaskById,
  updateTask,
  deleteTask,
} = require('../models/taskModel');

const VALID_STATUSES = ['pending', 'in_progress', 'done'];

async function create(req, res) {
  const { title, description, due_date } = req.body;
  if (!title) {
    return res.status(400).json({ error: 'title is required' });
  }

  if (due_date && isNaN(Date.parse(due_date))) {
    return res.status(400).json({ error: 'due_date must be a valid ISO 8601 date' });
  }

  const task = await createTask({ userId: req.user.id, title, description, dueDate: due_date });
  res.status(201).json(task);
}

async function list(req, res) {
  const { status, overdue } = req.query;
  if (status && !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` });
  }

  const tasks = await listTasksByUser(req.user.id, { status, overdue: overdue === 'true' });
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

  const fields = { title, description, status };
  if ('due_date' in req.body) {
    const due_date = req.body.due_date;
    if (due_date !== null && isNaN(Date.parse(due_date))) {
      return res.status(400).json({ error: 'due_date must be a valid ISO 8601 date or null' });
    }
    fields.dueDate = due_date;
  }

  const task = await updateTask(req.params.id, req.user.id, fields);
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
