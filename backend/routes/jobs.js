const express = require('express');
const router = express.Router();
const db = require('../utils/dbStore');
const { authMiddleware, checkRole } = require('../middleware/auth');
const { calculateMatch } = require('../utils/matcher');

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

// Helper to decorate job with match score for a student
const decorateJobWithMatch = (job, studentProfile) => {
  if (!studentProfile) {
    return { ...job, matchScore: null, missingSkills: [], matchSuggestions: [] };
  }
  const matchResult = calculateMatch(studentProfile.skills, job.requirements || []);
  return {
    ...job,
    matchScore: matchResult.matchScore,
    missingSkills: matchResult.missingSkills,
    matchSuggestions: matchResult.suggestions
  };
};

// @route   GET /api/jobs
// @desc    Get all jobs (students/public) - lists approved jobs only
// @access  Public / Private (Decores match score if logged in as student)
router.get('/', async (req, res) => {
  const authHeader = req.headers.authorization;
  let studentProfile = null;

  // Optional student matching context
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const jwt = require('jsonwebtoken');
    const { JWT_ACCESS_SECRET } = require('../middleware/auth');
    try {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_ACCESS_SECRET);
      if (decoded.role === 'student') {
        studentProfile = await db.studentProfiles.findOne({ userId: decoded.id });
      }
    } catch (err) {
      // Ignore token verification error for public listings
    }
  }

  // Get only approved jobs for general board
  const jobs = await db.jobs.find({ status: 'Approved' });

  // Decorate with match score if profile exists
  const decoratedJobs = jobs.map((job) => decorateJobWithMatch(job, studentProfile));

  // Sort by match score if student, else sort by date
  if (studentProfile) {
    decoratedJobs.sort((a, b) => b.matchScore - a.matchScore);
  } else {
    decoratedJobs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  res.json(decoratedJobs);
});

// @route   GET /api/jobs/recruiter
// @desc    Get all jobs posted by the logged-in recruiter
// @access  Private (Recruiter only)
router.get('/recruiter', authMiddleware, checkRole(['recruiter']), async (req, res) => {
  const jobs = await db.jobs.find({ recruiterId: req.user.id });
  res.json(jobs);
});

// @route   GET /api/jobs/:id
// @desc    Get job by ID
// @access  Public / Private
router.get('/:id', async (req, res) => {
  const job = await db.jobs.findById(req.params.id);
  if (!job) {
    return res.status(404).json({ message: 'Job not found' });
  }

  const authHeader = req.headers.authorization;
  let studentProfile = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const jwt = require('jsonwebtoken');
    const { JWT_ACCESS_SECRET } = require('../middleware/auth');
    try {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_ACCESS_SECRET);
      if (decoded.role === 'student') {
        studentProfile = await db.studentProfiles.findOne({ userId: decoded.id });
      }
    } catch (err) {
      // Ignore
    }
  }

  res.json(decorateJobWithMatch(job, studentProfile));
});

// @route   POST /api/jobs
// @desc    Post a new job
// @access  Private (Recruiter only)
router.post('/', authMiddleware, checkRole(['recruiter']), async (req, res) => {
  const { title, company, description, requirements, location, type, salary } = req.body;

  if (!title || !company || !description || !requirements || !location) {
    return res.status(400).json({ message: 'Please enter all required fields' });
  }

  // Auto-split requirements if passed as comma separated string
  const requirementsArray = Array.isArray(requirements)
    ? requirements
    : requirements.split(',').map((r) => r.trim()).filter(Boolean);

  const newJob = await db.jobs.create({
    title,
    company,
    recruiterId: req.user.id,
    description,
    requirements: requirementsArray,
    location,
    type: type || 'Full-time',
    salary: salary || 'Not disclosed',
    status: 'Approved'
  });

  res.status(201).json(newJob);
});

// @route   PUT /api/jobs/:id
// @desc    Edit an existing job
// @access  Private (Recruiter only)
router.put('/:id', authMiddleware, checkRole(['recruiter']), async (req, res) => {
  const job = await db.jobs.findById(req.params.id);
  if (!job) {
    return res.status(404).json({ message: 'Job not found' });
  }

  if (job.recruiterId !== req.user.id) {
    return res.status(403).json({ message: 'Not authorized to edit this job' });
  }

  const requirementsArray = req.body.requirements
    ? (Array.isArray(req.body.requirements)
      ? req.body.requirements
      : req.body.requirements.split(',').map((r) => r.trim()).filter(Boolean))
    : job.requirements;

  const updatedJob = await db.jobs.findByIdAndUpdate(req.params.id, {
    title: req.body.title || job.title,
    company: req.body.company || job.company,
    description: req.body.description || job.description,
    requirements: requirementsArray,
    location: req.body.location || job.location,
    type: req.body.type || job.type,
    salary: req.body.salary || job.salary,
    status: req.body.status || job.status || 'Approved'
  });

  res.json(updatedJob);
});

// @route   DELETE /api/jobs/:id
// @desc    Delete a job
// @access  Private (Recruiter or Admin)
router.delete('/:id', authMiddleware, checkRole(['recruiter', 'admin']), async (req, res) => {
  const job = await db.jobs.findById(req.params.id);
  if (!job) {
    return res.status(404).json({ message: 'Job not found' });
  }

  // Check ownership unless admin
  if (req.user.role !== 'admin' && job.recruiterId !== req.user.id) {
    return res.status(403).json({ message: 'Not authorized to delete this job' });
  }

  await db.jobs.findByIdAndDelete(req.params.id);
  res.json({ message: 'Job deleted successfully' });
});

module.exports = router;
