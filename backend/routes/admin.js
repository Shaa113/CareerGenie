const express = require('express');
const router = express.Router();
const db = require('../utils/dbStore');
const { authMiddleware, checkRole } = require('../middleware/auth');

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

// @route   GET /api/admin/analytics
// @desc    Get system-wide analytics
// @access  Private (Admin only)
router.get('/analytics', authMiddleware, checkRole(['admin']), async (req, res) => {
  const users = await db.users.read();
  const jobs = await db.jobs.read();
  const apps = await db.applications.read();
  const profiles = await db.studentProfiles.read();
  const complaints = await db.complaints.read();

  const totalStudents = users.filter((u) => u.role === 'student').length;
  const totalRecruiters = users.filter((u) => u.role === 'recruiter').length;
  const totalAdmins = users.filter((u) => u.role === 'admin').length;

  const pendingJobs = jobs.filter((j) => j.status === 'Pending').length;
  const approvedJobs = jobs.filter((j) => j.status === 'Approved').length;

  const resolvedComplaints = complaints.filter((c) => c.status === 'Resolved').length;
  const openComplaints = complaints.filter((c) => c.status !== 'Resolved').length;

  // Average ATS Score
  const profilesWithScores = profiles.filter((p) => p.atsScore > 0);
  const avgAtsScore = profilesWithScores.length > 0
    ? Math.round(profilesWithScores.reduce((acc, curr) => acc + curr.atsScore, 0) / profilesWithScores.length)
    : 0;

  res.json({
    users: {
      total: users.length,
      students: totalStudents,
      recruiters: totalRecruiters,
      admins: totalAdmins
    },
    jobs: {
      total: jobs.length,
      pending: pendingJobs,
      approved: approvedJobs
    },
    applications: {
      total: apps.length
    },
    complaints: {
      total: complaints.length,
      resolved: resolvedComplaints,
      open: openComplaints
    },
    avgAtsScore
  });
});

// @route   GET /api/admin/users
// @desc    Get all users for user management
// @access  Private (Admin only)
router.get('/users', authMiddleware, checkRole(['admin']), async (req, res) => {
  const users = await db.users.read();
  const safeUsers = users.map((user) => {
    const { password, ...rest } = user;
    return rest;
  });
  res.json(safeUsers);
});

// @route   DELETE /api/admin/users/:id
// @desc    Delete a user and clean up profile/jobs/applications
// @access  Private (Admin only)
router.delete('/users/:id', authMiddleware, checkRole(['admin']), async (req, res) => {
  const user = await db.users.findById(req.params.id);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  if (user.id === req.user.id) {
    return res.status(400).json({ message: 'You cannot delete your own admin account' });
  }

  await db.users.findByIdAndDelete(req.params.id);

  if (user.role === 'student') {
    const profile = await db.studentProfiles.findOne({ userId: user.id });
    if (profile) {
      await db.studentProfiles.findByIdAndDelete(profile.id);
    }
    const apps = await db.applications.find({ studentId: user.id });
    await Promise.all(apps.map((app) => db.applications.findByIdAndDelete(app.id)));
  }

  if (user.role === 'recruiter') {
    const jobs = await db.jobs.find({ recruiterId: user.id });
    for (const job of jobs) {
      const apps = await db.applications.find({ jobId: job.id });
      await Promise.all(apps.map((app) => db.applications.findByIdAndDelete(app.id)));
      await db.jobs.findByIdAndDelete(job.id);
    }
  }

  res.json({ message: 'User deleted and references cleaned up' });
});

// @route   GET /api/admin/jobs
// @desc    Get all jobs (pending and approved) for moderation
// @access  Private (Admin only)
router.get('/jobs', authMiddleware, checkRole(['admin']), async (req, res) => {
  const jobs = await db.jobs.read();
  const populatedJobs = await Promise.all(jobs.map(async (job) => {
    const recruiter = await db.users.findById(job.recruiterId);
    return {
      ...job,
      recruiter: recruiter ? { name: recruiter.name, email: recruiter.email } : { name: 'System', email: '' }
    };
  }));
  res.json(populatedJobs);
});

// @route   PUT /api/admin/jobs/:id/approve
// @desc    Moderate job posting (approve/reject)
// @access  Private (Admin only)
router.put('/jobs/:id/approve', authMiddleware, checkRole(['admin']), async (req, res) => {
  const { status } = req.body;

  if (!status || !['Approved', 'Rejected'].includes(status)) {
    return res.status(400).json({ message: 'Status must be Approved or Rejected' });
  }

  const job = await db.jobs.findById(req.params.id);
  if (!job) {
    return res.status(404).json({ message: 'Job not found' });
  }

  const updatedJob = await db.jobs.findByIdAndUpdate(req.params.id, { status });

  await db.notifications.create({
    recipient: job.recruiterId,
    title: `Job Posting ${status}`,
    message: `Your job posting for "${job.title}" has been ${status.toLowerCase()} by the moderator.`
  });

  res.json(updatedJob);
});

// @route   GET /api/admin/complaints
// @desc    Get all complaints
// @access  Private (Admin only)
router.get('/complaints', authMiddleware, checkRole(['admin']), async (req, res) => {
  const complaints = await db.complaints.read();
  const populatedComplaints = await Promise.all(complaints.map(async (c) => {
    const user = await db.users.findById(c.userId);
    return {
      ...c,
      user: user ? { name: user.name, email: user.email, role: user.role } : { name: 'Anonymous', email: '' }
    };
  }));
  res.json(populatedComplaints);
});

// @route   PUT /api/admin/complaints/:id
// @desc    Resolve/update complaint status
// @access  Private (Admin only)
router.put('/complaints/:id', authMiddleware, checkRole(['admin']), async (req, res) => {
  const { status } = req.body;
  if (!status || !['Open', 'In Progress', 'Resolved'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status' });
  }

  const complaint = await db.complaints.findById(req.params.id);
  if (!complaint) {
    return res.status(404).json({ message: 'Complaint not found' });
  }

  const updated = await db.complaints.findByIdAndUpdate(req.params.id, { status });

  await db.notifications.create({
    recipient: complaint.userId,
    title: 'Complaint Status Update',
    message: `Your ticket "${complaint.title}" status is now: ${status}.`
  });

  res.json(updated);
});

// @route   POST /api/admin/complaints
// @desc    Submit a complaint (any authenticated user)
// @access  Private
router.post('/complaints', authMiddleware, async (req, res) => {
  const { title, description } = req.body;
  if (!title || !description) {
    return res.status(400).json({ message: 'Title and description are required' });
  }

  const complaint = await db.complaints.create({
    userId: req.user.id,
    title,
    description,
    status: 'Open'
  });

  res.status(201).json(complaint);
});

module.exports = router;
