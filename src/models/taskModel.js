const pool = require('../config/db');

async function createTask({ userId, title, description }) {
  const result = await pool.query(
    `INSERT INTO tasks (user_id, title, description)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [userId, title, description || null]
  );
  return result.rows[0];
}

async function listTasksByUser(userId, { status } = {}) {
  if (status) {
    const result = await pool.query(
      'SELECT * FROM tasks WHERE user_id = $1 AND status = $2 ORDER BY created_at DESC',
      [userId, status]
    );
    return result.rows;
  }
  const result = await pool.query(
    'SELECT * FROM tasks WHERE user_id = $1 ORDER BY created_at DESC',
    [userId]
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
  const { title, description, status } = fields;
  const result = await pool.query(
    `UPDATE tasks
     SET title = COALESCE($1, title),
         description = COALESCE($2, description),
         status = COALESCE($3, status),
         updated_at = now()
     WHERE id = $4 AND user_id = $5
     RETURNING *`,
    [title ?? null, description ?? null, status ?? null, id, userId]
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
