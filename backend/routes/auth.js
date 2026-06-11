const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../utils/dbStore');
const {
  authMiddleware,
  issueTokenPair,
  JWT_REFRESH_SECRET
} = require('../middleware/auth');

const wrapAsyncHandlers = (routerInstance) => {
  ['get', 'post', 'put', 'delete', 'patch'].forEach((method) => {
    const original = routerInstance[method].bind(routerInstance);
    routerInstance[method] = (path, ...handlers) =>
      original(
        path,
        ...handlers.map((handler) => (
          typeof handler === 'function'
            ? (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next)
            : handler
        ))
      );
  });
};

wrapAsyncHandlers(router);

const sanitizeUser = (user) => {
  const { password, refreshTokenHash, ...safeUser } = user;
  return safeUser;
};

const normalizeEmail = (email) => (email || '').trim().toLowerCase();

const isStrongEnoughPassword = (password) => typeof password === 'string' && password.trim().length >= 8;

async function persistRefreshToken(userId, refreshToken) {
  const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
  await db.users.findByIdAndUpdate(userId, { refreshTokenHash });
  return refreshTokenHash;
}

async function buildAuthResponse(user) {
  const tokens = issueTokenPair({ id: user.id, role: user.role });
  await persistRefreshToken(user.id, tokens.refreshToken);
  return {
    ...tokens,
    user: sanitizeUser(user)
  };
}

// @route   POST /api/auth/register
// @desc    Register a user (Student, Recruiter, Admin)
// @access  Public
router.post('/register', async (req, res) => {
  const { name, email, password, role } = req.body;
  const normalizedEmail = normalizeEmail(email);
  const safeRole = ['student', 'recruiter', 'admin'].includes(role) ? role : 'student';

  if (!name || !normalizedEmail || !password) {
    return res.status(400).json({ message: 'Please enter all fields' });
  }

  if (!isStrongEnoughPassword(password)) {
    return res.status(400).json({ message: 'Password must be at least 8 characters long' });
  }

  // Check if user exists
  const existingUser = await db.users.findOne({ email: normalizedEmail });
  if (existingUser) {
    return res.status(400).json({ message: 'User already exists' });
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create User
  let newUser;
  try {
    newUser = await db.users.create({
      name,
      email: normalizedEmail,
      password: hashedPassword,
      role: safeRole,
      avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'User already exists' });
    }
    throw error;
  }

  // If user is a student, create an empty student profile
  if (safeRole === 'student') {
    await db.studentProfiles.create({
      userId: newUser.id,
      skills: [],
      education: [],
      experience: [],
      certifications: [],
      projects: [],
      resumeUrl: '',
      resumeText: '',
      resumeFile: null,
      atsScore: 0,
      missingSkills: [],
      suggestions: [],
      industryReadinessScore: 0
    });
  }

  const authResponse = await buildAuthResponse(newUser);
  res.status(201).json(authResponse);
});

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail || !password) {
    return res.status(400).json({ message: 'Please enter all fields' });
  }

  // Check user
  const user = await db.users.findOne({ email: normalizedEmail });
  if (!user) {
    return res.status(400).json({ message: 'Invalid credentials' });
  }

  // Validate password
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(400).json({ message: 'Invalid credentials' });
  }

  const authResponse = await buildAuthResponse(user);
  res.json(authResponse);
});

// @route   GET /api/auth/me
// @desc    Get current user details
// @access  Private
router.get('/me', authMiddleware, async (req, res) => {
  const user = await db.users.findById(req.user.id);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  res.json(sanitizeUser(user));
});

// @route   POST /api/auth/refresh
// @desc    Rotate refresh token and issue a new access token
// @access  Public
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ message: 'Refresh token is required' });
  }

  try {
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    const user = await db.users.findById(decoded.id);

    if (!user || !user.refreshTokenHash) {
      return res.status(401).json({ message: 'Session expired. Please sign in again.' });
    }

    const tokenMatches = await bcrypt.compare(refreshToken, user.refreshTokenHash);
    if (!tokenMatches) {
      return res.status(401).json({ message: 'Session expired. Please sign in again.' });
    }

    const authResponse = await buildAuthResponse(user);
    res.json(authResponse);
  } catch (error) {
    return res.status(401).json({ message: 'Session expired. Please sign in again.' });
  }
});

// @route   POST /api/auth/logout
// @desc    Clear refresh session for the current user
// @access  Private
router.post('/logout', authMiddleware, async (req, res) => {
  await db.users.findByIdAndUpdate(req.user.id, { refreshTokenHash: null });
  res.json({ message: 'Logged out successfully' });
});

module.exports = router;
