const {
  createTask,
  listTasksByUser,
  findTaskById,
  updateTask,
  deleteTask,
} = require('../models/taskModel');

const VALID_STATUSES = ['pending', 'in_progress', 'done'];
const VALID_PRIORITIES = ['low', 'medium', 'high'];

function normalizeLabels(labels) {
  if (!Array.isArray(labels) || !labels.every((l) => typeof l === 'string')) {
    return { error: 'labels must be an array of strings' };
  }

  const normalized = [...new Set(labels.map((l) => l.trim()).filter(Boolean))];
  return { value: normalized };
}

async function create(req, res) {
  const { title, description, due_date, priority, labels } = req.body;
  if (!title) {
    return res.status(400).json({ error: 'title is required' });
  }

  if (due_date && isNaN(Date.parse(due_date))) {
    return res.status(400).json({ error: 'due_date must be a valid ISO 8601 date' });
  }

  if (priority && !VALID_PRIORITIES.includes(priority)) {
    return res.status(400).json({ error: `priority must be one of: ${VALID_PRIORITIES.join(', ')}` });
  }

  let normalizedLabels;
  if (labels !== undefined) {
    const result = normalizeLabels(labels);
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }
    normalizedLabels = result.value;
  }

  const task = await createTask({
    userId: req.user.id,
    title,
    description,
    dueDate: due_date,
    priority,
    labels: normalizedLabels,
  });
  res.status(201).json(task);
}

async function list(req, res) {
  const { status, overdue, priority, label } = req.query;
  if (status && !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` });
  }

  if (priority && !VALID_PRIORITIES.includes(priority)) {
    return res.status(400).json({ error: `priority must be one of: ${VALID_PRIORITIES.join(', ')}` });
  }

  const tasks = await listTasksByUser(req.user.id, {
    status,
    overdue: overdue === 'true',
    priority,
    label,
  });
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
  const { title, description, status, priority, labels } = req.body;
  if (status && !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` });
  }

  if (priority && !VALID_PRIORITIES.includes(priority)) {
    return res.status(400).json({ error: `priority must be one of: ${VALID_PRIORITIES.join(', ')}` });
  }

  const fields = { title, description, status, priority };
  if ('due_date' in req.body) {
    const due_date = req.body.due_date;
    if (due_date !== null && isNaN(Date.parse(due_date))) {
      return res.status(400).json({ error: 'due_date must be a valid ISO 8601 date or null' });
    }
    fields.dueDate = due_date;
  }

  if (labels !== undefined) {
    const result = normalizeLabels(labels);
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }
    fields.labels = result.value;
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
