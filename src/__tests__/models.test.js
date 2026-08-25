require('dotenv').config();
const bcrypt = require('bcrypt');
const pool = require('../config/db');
const { createUser, findUserById } = require('../models/userModel');

afterAll(async () => {
  await pool.end();
});

describe('userModel.findUserById', () => {
  it('returns the user without the password hash', async () => {
    const email = `model_${Date.now()}_${Math.random().toString(36).slice(2)}@example.com`;
    const passwordHash = await bcrypt.hash('password123', 10);
    const created = await createUser({ email, passwordHash });

    const found = await findUserById(created.id);

    expect(found).toMatchObject({ id: created.id, email, role: 'user' });
    expect(found).not.toHaveProperty('password_hash');
  });

  it('returns undefined for a user that does not exist', async () => {
    const found = await findUserById(999999999);
    expect(found).toBeUndefined();
  });
});
