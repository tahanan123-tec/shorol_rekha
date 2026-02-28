const express = require('express');
const authController = require('../controllers/auth.controller');
const { validate } = require('../middleware/validator');
const advancedRateLimiter = require('../middleware/advancedRateLimiter');

const router = express.Router();

// Register new user
router.post('/register', validate('register'), authController.register);

// Login (with advanced rate limiting: 3 per minute per student, 10 per minute per IP)
router.post('/login', advancedRateLimiter.loginRateLimiter(), validate('login'), authController.login);

// Validate token
router.get('/validate', authController.validate);

// Refresh access token
router.post('/refresh', validate('refreshToken'), authController.refresh);

// Logout (revoke refresh token)
router.post('/logout', authController.logout);

// Get current user info
router.get('/me', authController.me);

module.exports = router;
