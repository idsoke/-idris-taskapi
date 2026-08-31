const request = require('supertest');
const app = require('../app');
const pool = require('../config/db');

let token;
let otherToken;

async function registerAndLogin(emailPrefix) {
  const email = `${emailPrefix}_${Date.now()}_${Math.random().toString(36).slice(2)}@example.com`;
  const res = await request(app).post('/auth/register').send({ email, password: 'password123' });
  return res.body.token;
}

beforeAll(async () => {
  token = await registerAndLogin('tasks_owner');
  otherToken = await registerAndLogin('tasks_other');
});

afterAll(async () => {
  await pool.end();
});

describe('POST /tasks', () => {
  it('creates a task with just a title', async () => {
    const res = await request(app)
      .post('/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Buy groceries' });

    expect(res.statusCode).toBe(201);
    expect(res.body).toMatchObject({ title: 'Buy groceries', status: 'pending' });
    expect(res.body).toHaveProperty('id');
  });

  it('creates a task with description and due_date', async () => {
    const res = await request(app)
      .post('/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Finish report', description: 'Q3 numbers', due_date: '2026-09-01T00:00:00Z' });

    expect(res.statusCode).toBe(201);
    expect(res.body.description).toBe('Q3 numbers');
    expect(new Date(res.body.due_date).toISOString()).toBe('2026-09-01T00:00:00.000Z');
  });

  it('defaults priority to medium when not provided', async () => {
    const res = await request(app)
      .post('/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'No priority given' });

    expect(res.statusCode).toBe(201);
    expect(res.body.priority).toBe('medium');
  });

  it('creates a task with an explicit priority', async () => {
    const res = await request(app)
      .post('/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Urgent fix', priority: 'high' });

    expect(res.statusCode).toBe(201);
    expect(res.body.priority).toBe('high');
  });

  it('returns 400 for an invalid priority', async () => {
    const res = await request(app)
      .post('/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Bad priority', priority: 'urgent' });

    expect(res.statusCode).toBe(400);
  });

  it('creates a task with labels', async () => {
    const res = await request(app)
      .post('/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Tagged task', labels: ['work', 'urgent'] });

    expect(res.statusCode).toBe(201);
    expect(res.body.labels).toEqual(['work', 'urgent']);
  });

  it('trims and dedupes labels on create', async () => {
    const res = await request(app)
      .post('/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Messy labels', labels: [' work ', 'work', '', '  '] });

    expect(res.statusCode).toBe(201);
    expect(res.body.labels).toEqual(['work']);
  });

  it('defaults labels to an empty array when not provided', async () => {
    const res = await request(app)
      .post('/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'No labels given' });

    expect(res.statusCode).toBe(201);
    expect(res.body.labels).toEqual([]);
  });

  it('returns 400 when labels is not an array of strings', async () => {
    const res = await request(app)
      .post('/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Bad labels', labels: ['work', 42] });

    expect(res.statusCode).toBe(400);
  });

  it('returns 400 when title is missing', async () => {
    const res = await request(app)
      .post('/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({ description: 'no title here' });

    expect(res.statusCode).toBe(400);
  });

  it('returns 400 when due_date is not a valid date', async () => {
    const res = await request(app)
      .post('/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Bad date', due_date: 'not-a-date' });

    expect(res.statusCode).toBe(400);
  });

  it('returns 401 without a token', async () => {
    const res = await request(app).post('/tasks').send({ title: 'No auth' });
    expect(res.statusCode).toBe(401);
  });
});

describe('GET /tasks', () => {
  it('lists only the requesting user\'s tasks', async () => {
    await request(app)
      .post('/tasks')
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ title: 'Other user task' });

    const res = await request(app).get('/tasks').set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.every((t) => t.title !== 'Other user task')).toBe(true);
  });

  it('filters by status', async () => {
    const created = await request(app)
      .post('/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'To be done' });

    await request(app)
      .patch(`/tasks/${created.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'done' });

    const res = await request(app)
      .get('/tasks?status=done')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.every((t) => t.status === 'done')).toBe(true);
    expect(res.body.some((t) => t.id === created.body.id)).toBe(true);
  });

  it('returns 400 for an invalid status filter', async () => {
    const res = await request(app)
      .get('/tasks?status=bogus')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(400);
  });

  it('filters by priority', async () => {
    const created = await request(app)
      .post('/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Low priority chore', priority: 'low' });

    const res = await request(app)
      .get('/tasks?priority=low')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.every((t) => t.priority === 'low')).toBe(true);
    expect(res.body.some((t) => t.id === created.body.id)).toBe(true);
  });

  it('returns 400 for an invalid priority filter', async () => {
    const res = await request(app)
      .get('/tasks?priority=urgent')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(400);
  });

  it('filters by label', async () => {
    const created = await request(app)
      .post('/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Personal errand', labels: ['personal'] });

    const res = await request(app)
      .get('/tasks?label=personal')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.every((t) => t.labels.includes('personal'))).toBe(true);
    expect(res.body.some((t) => t.id === created.body.id)).toBe(true);
  });

  it('filters overdue tasks', async () => {
    const overdue = await request(app)
      .post('/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Overdue task', due_date: '2020-01-01T00:00:00Z' });

    const res = await request(app)
      .get('/tasks?overdue=true')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.some((t) => t.id === overdue.body.id)).toBe(true);
    expect(res.body.every((t) => t.status !== 'done')).toBe(true);
  });
});

describe('GET /tasks/:id', () => {
  it('returns a task owned by the requesting user', async () => {
    const created = await request(app)
      .post('/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Fetch me' });

    const res = await request(app)
      .get(`/tasks/${created.body.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.id).toBe(created.body.id);
  });

  it('returns 404 for a task that does not exist', async () => {
    const res = await request(app).get('/tasks/999999999').set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(404);
  });

  it("returns 404 for another user's task", async () => {
    const created = await request(app)
      .post('/tasks')
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ title: 'Belongs to other user' });

    const res = await request(app)
      .get(`/tasks/${created.body.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(404);
  });
});

describe('PATCH /tasks/:id', () => {
  it('updates title, description, and status', async () => {
    const created = await request(app)
      .post('/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Original title' });

    const res = await request(app)
      .patch(`/tasks/${created.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Updated title', description: 'Updated desc', status: 'in_progress' });

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      title: 'Updated title',
      description: 'Updated desc',
      status: 'in_progress',
    });
  });

  it('leaves fields untouched when not provided', async () => {
    const created = await request(app)
      .post('/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Keep my description', description: 'do not lose me' });

    const res = await request(app)
      .patch(`/tasks/${created.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'in_progress' });

    expect(res.statusCode).toBe(200);
    expect(res.body.description).toBe('do not lose me');
    expect(res.body.title).toBe('Keep my description');
  });

  it('clears due_date when explicitly set to null', async () => {
    const created = await request(app)
      .post('/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Has a due date', due_date: '2026-10-01T00:00:00Z' });

    const res = await request(app)
      .patch(`/tasks/${created.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ due_date: null });

    expect(res.statusCode).toBe(200);
    expect(res.body.due_date).toBeNull();
  });

  it('updates priority', async () => {
    const created = await request(app)
      .post('/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Bump priority' });

    const res = await request(app)
      .patch(`/tasks/${created.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ priority: 'high' });

    expect(res.statusCode).toBe(200);
    expect(res.body.priority).toBe('high');
  });

  it('replaces labels', async () => {
    const created = await request(app)
      .post('/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Relabel me', labels: ['work'] });

    const res = await request(app)
      .patch(`/tasks/${created.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ labels: ['personal', 'urgent'] });

    expect(res.statusCode).toBe(200);
    expect(res.body.labels).toEqual(['personal', 'urgent']);
  });

  it('clears labels when set to an empty array', async () => {
    const created = await request(app)
      .post('/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Unlabel me', labels: ['work'] });

    const res = await request(app)
      .patch(`/tasks/${created.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ labels: [] });

    expect(res.statusCode).toBe(200);
    expect(res.body.labels).toEqual([]);
  });

  it('returns 400 for invalid labels on update', async () => {
    const created = await request(app)
      .post('/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Bad relabel target' });

    const res = await request(app)
      .patch(`/tasks/${created.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ labels: 'not-an-array' });

    expect(res.statusCode).toBe(400);
  });

  it('returns 400 for an invalid status', async () => {
    const created = await request(app)
      .post('/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Invalid status target' });

    const res = await request(app)
      .patch(`/tasks/${created.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'bogus' });

    expect(res.statusCode).toBe(400);
  });

  it('returns 400 for an invalid priority', async () => {
    const created = await request(app)
      .post('/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Invalid priority target' });

    const res = await request(app)
      .patch(`/tasks/${created.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ priority: 'urgent' });

    expect(res.statusCode).toBe(400);
  });

  it('returns 400 for an invalid due_date', async () => {
    const created = await request(app)
      .post('/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Invalid due date target' });

    const res = await request(app)
      .patch(`/tasks/${created.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ due_date: 'not-a-date' });

    expect(res.statusCode).toBe(400);
  });

  it('returns 404 for a task that does not exist', async () => {
    const res = await request(app)
      .patch('/tasks/999999999')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Ghost' });

    expect(res.statusCode).toBe(404);
  });

  it("returns 404 when updating another user's task", async () => {
    const created = await request(app)
      .post('/tasks')
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ title: 'Not yours' });

    const res = await request(app)
      .patch(`/tasks/${created.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Hijacked' });

    expect(res.statusCode).toBe(404);
  });
});

describe('DELETE /tasks/:id', () => {
  it('deletes a task owned by the requesting user', async () => {
    const created = await request(app)
      .post('/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Delete me' });

    const del = await request(app)
      .delete(`/tasks/${created.body.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(del.statusCode).toBe(204);

    const getAfter = await request(app)
      .get(`/tasks/${created.body.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(getAfter.statusCode).toBe(404);
  });

  it('returns 404 for a task that does not exist', async () => {
    const res = await request(app)
      .delete('/tasks/999999999')
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(404);
  });

  it("returns 404 when deleting another user's task", async () => {
    const created = await request(app)
      .post('/tasks')
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ title: 'Also not yours' });

    const res = await request(app)
      .delete(`/tasks/${created.body.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(404);
  });
});
