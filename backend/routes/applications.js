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

// @route   POST /api/applications
// @desc    Apply for a job
// @access  Private (Student only)
router.post('/', authMiddleware, checkRole(['student']), async (req, res) => {
  const { jobId } = req.body;

  if (!jobId) {
    return res.status(400).json({ message: 'Job ID is required' });
  }

  // Check if job exists
  const job = await db.jobs.findById(jobId);
  if (!job) {
    return res.status(404).json({ message: 'Job not found' });
  }

  // Check if already applied
  const existingApp = await db.applications.findOne({ jobId, studentId: req.user.id });
  if (existingApp) {
    return res.status(400).json({ message: 'You have already applied for this job' });
  }

  // Get student profile
  const profile = await db.studentProfiles.findOne({ userId: req.user.id });
  if (!profile) {
    return res.status(400).json({ message: 'Please complete your student profile first' });
  }

  // Calculate Match Score
  const matchResult = calculateMatch(profile.skills, job.requirements || []);

  let application;
  try {
    application = await db.applications.create({
      jobId,
      studentId: req.user.id,
      resumeUrl: profile.resumeUrl || '',
      matchScore: matchResult.matchScore,
      missingSkills: matchResult.missingSkills,
      status: 'Applied'
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'You have already applied for this job' });
    }
    throw error;
  }

  // Create confirmation notification
  await db.notifications.create({
    recipient: req.user.id,
    title: 'Application Submitted!',
    message: `You applied to ${job.title} at ${job.company}. Match score: ${matchResult.matchScore}%`
  });

  res.status(201).json(application);
});

// @route   GET /api/applications/student
// @desc    Get current student's applications
// @access  Private (Student only)
router.get('/student', authMiddleware, checkRole(['student']), async (req, res) => {
  const apps = await db.applications.find({ studentId: req.user.id });

  // Populate job details
  const populatedApps = await Promise.all(apps.map(async (app) => {
    const job = await db.jobs.findById(app.jobId);
    return {
      ...app,
      job: job || { title: 'Unknown Role', company: 'Unknown Company', location: 'Unknown' }
    };
  }));

  res.json(populatedApps);
});

// @route   GET /api/applications/job/:jobId
// @desc    Get all applicants for a recruiter job
// @access  Private (Recruiter only)
router.get('/job/:jobId', authMiddleware, checkRole(['recruiter']), async (req, res) => {
  const job = await db.jobs.findById(req.params.jobId);
  if (!job) {
    return res.status(404).json({ message: 'Job not found' });
  }

  if (job.recruiterId !== req.user.id) {
    return res.status(403).json({ message: 'Not authorized to view applicants for this job' });
  }

  const apps = await db.applications.find({ jobId: req.params.jobId });

  // Populate student details
  const populatedApps = await Promise.all(apps.map(async (app) => {
    const studentUser = await db.users.findById(app.studentId);
    const studentProfile = await db.studentProfiles.findOne({ userId: app.studentId });

    return {
      ...app,
      student: studentUser ? {
        id: studentUser.id,
        name: studentUser.name,
        email: studentUser.email,
        avatar: studentUser.avatar
      } : { name: 'Deactivated User', email: '' },
      profile: studentProfile || { skills: [], experience: [], education: [] }
    };
  }));

  // Sort from highest match percentage to lowest
  populatedApps.sort((a, b) => b.matchScore - a.matchScore);

  res.json(populatedApps);
});

// @route   PUT /api/applications/:id/status
// @desc    Update application status
// @access  Private (Recruiter only)
router.put('/:id/status', authMiddleware, checkRole(['recruiter']), async (req, res) => {
  const { status } = req.body;

  if (!status || !['Applied', 'Reviewing', 'Shortlisted', 'Rejected', 'Accepted'].includes(status)) {
    return res.status(400).json({ message: 'Invalid application status' });
  }

  const app = await db.applications.findById(req.params.id);
  if (!app) {
    return res.status(404).json({ message: 'Application not found' });
  }

  // Verify ownership of the job
  const job = await db.jobs.findById(app.jobId);
  if (!job || job.recruiterId !== req.user.id) {
    return res.status(403).json({ message: 'Not authorized to update status' });
  }

  const updatedApp = await db.applications.findByIdAndUpdate(req.params.id, { status });

  // Notify student
  await db.notifications.create({
    recipient: app.studentId,
    title: 'Application Status Update',
    message: `Your application status for ${job.title} at ${job.company} is now: ${status}.`
  });

  res.json(updatedApp);
});

module.exports = router;
