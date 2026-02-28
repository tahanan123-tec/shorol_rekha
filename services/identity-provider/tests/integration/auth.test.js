const request = require('supertest');
const app = require('../../src/index');

describe('Auth Integration Tests', () => {
  let testUser = {
    student_id: `TEST${Date.now()}`,
    email: `test${Date.now()}@university.edu`,
    password: 'TestPass123!',
    full_name: 'Test User',
  };

  let accessToken;
  let refreshToken;

  describe('POST /auth/register', () => {
    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send(testUser)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.student_id).toBe(testUser.student_id);
      expect(response.body.data.email).toBe(testUser.email);
      expect(response.body.data.password_hash).toBeUndefined();
    });

    it('should reject duplicate student_id', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send(testUser)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('already registered');
    });

    it('should reject invalid email', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          ...testUser,
          student_id: 'NEW123',
          email: 'invalid-email',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject weak password', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          ...testUser,
          student_id: 'NEW456',
          email: 'new@university.edu',
          password: 'weak',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          student_id: testUser.student_id,
          password: testUser.password,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.access_token).toBeDefined();
      expect(response.body.data.refresh_token).toBeDefined();
      expect(response.body.data.user.student_id).toBe(testUser.student_id);

      accessToken = response.body.data.access_token;
      refreshToken = response.body.data.refresh_token;
    });

    it('should reject invalid credentials', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          student_id: testUser.student_id,
          password: 'WrongPassword123!',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid credentials');
    });

    it('should reject non-existent user', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          student_id: 'NONEXISTENT',
          password: 'Password123!',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should enforce rate limiting', async () => {
      // Make 3 login attempts (max allowed)
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post('/auth/login')
          .send({
            student_id: 'RATELIMIT',
            password: 'test',
          });
      }

      // 4th attempt should be rate limited
      const response = await request(app)
        .post('/auth/login')
        .send({
          student_id: 'RATELIMIT',
          password: 'test',
        })
        .expect(429);

      expect(response.body.error).toContain('Too many login attempts');
      expect(response.body.retry_after).toBeDefined();
    });
  });

  describe('GET /auth/validate', () => {
    it('should validate a valid token', async () => {
      const response = await request(app)
        .get('/auth/validate')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.valid).toBe(true);
      expect(response.body.data.user.student_id).toBe(testUser.student_id);
    });

    it('should reject missing token', async () => {
      const response = await request(app)
        .get('/auth/validate')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should reject invalid token', async () => {
      const response = await request(app)
        .get('/auth/validate')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /auth/refresh', () => {
    it('should refresh access token with valid refresh token', async () => {
      const response = await request(app)
        .post('/auth/refresh')
        .send({ refresh_token: refreshToken })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.access_token).toBeDefined();
      expect(response.body.data.access_token).not.toBe(accessToken);
    });

    it('should reject invalid refresh token', async () => {
      const response = await request(app)
        .post('/auth/refresh')
        .send({ refresh_token: 'invalid-refresh-token' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /auth/me', () => {
    it('should return current user info', async () => {
      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.student_id).toBe(testUser.student_id);
      expect(response.body.data.email).toBe(testUser.email);
    });

    it('should reject request without token', async () => {
      const response = await request(app)
        .get('/auth/me')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /auth/logout', () => {
    it('should logout successfully', async () => {
      const response = await request(app)
        .post('/auth/logout')
        .send({ refresh_token: refreshToken })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should not allow using revoked refresh token', async () => {
      const response = await request(app)
        .post('/auth/refresh')
        .send({ refresh_token: refreshToken })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});
