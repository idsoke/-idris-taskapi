const pool = require('../config/db');

async function createTask({ userId, title, description, dueDate, priority, labels }) {
  const result = await pool.query(
    `INSERT INTO tasks (user_id, title, description, due_date, priority, labels)
     VALUES ($1, $2, $3, $4, COALESCE($5, 'medium'), COALESCE($6::text[], '{}'))
     RETURNING *`,
    [userId, title, description || null, dueDate || null, priority || null, labels || null]
  );
  return result.rows[0];
}

async function listTasksByUser(userId, { status, overdue, priority, label } = {}) {
  const conditions = ['user_id = $1'];
  const params = [userId];

  if (status) {
    params.push(status);
    conditions.push(`status = $${params.length}`);
  }

  if (priority) {
    params.push(priority);
    conditions.push(`priority = $${params.length}`);
  }

  if (label) {
    params.push(label);
    conditions.push(`labels @> ARRAY[$${params.length}]::text[]`);
  }

  if (overdue === true) {
    conditions.push(`due_date < now() AND status != 'done'`);
  }

  const where = conditions.join(' AND ');
  const result = await pool.query(
    `SELECT * FROM tasks WHERE ${where} ORDER BY due_date ASC NULLS LAST, created_at DESC`,
    params
  );
  return result.rows;
}

async function findTaskById(id, userId) {
  const result = await pool.query('SELECT * FROM tasks WHERE id = $1 AND user_id = $2', [
    id,
    userId,
  ]);
  return result.rows[0];
}

async function updateTask(id, userId, fields) {
  const { title, description, status, dueDate, priority, labels } = fields;
  const result = await pool.query(
    `UPDATE tasks
     SET title = COALESCE($1, title),
         description = COALESCE($2, description),
         status = COALESCE($3, status),
         priority = COALESCE($4, priority),
         due_date = CASE WHEN $5 THEN $6 ELSE due_date END,
         labels = COALESCE($7::text[], labels),
         updated_at = now()
     WHERE id = $8 AND user_id = $9
     RETURNING *`,
    [
      title ?? null,
      description ?? null,
      status ?? null,
      priority ?? null,
      'dueDate' in fields,
      dueDate ?? null,
      labels ?? null,
      id,
      userId,
    ]
  );
  return result.rows[0];
}

async function deleteTask(id, userId) {
  const result = await pool.query('DELETE FROM tasks WHERE id = $1 AND user_id = $2 RETURNING id', [
    id,
    userId,
  ]);
  return result.rows[0];
}

module.exports = { createTask, listTasksByUser, findTaskById, updateTask, deleteTask };
