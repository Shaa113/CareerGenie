const express = require('express');
const router = express.Router();
const db = require('../utils/dbStore');
const { authMiddleware, checkRole } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { parseResumeText } = require('../utils/parser');
const { extractTextFromUpload } = require('../utils/resumeExtraction');
const fs = require('fs/promises');
const path = require('path');

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

const createEmptyStudentProfile = async (userId) => {
  try {
    return await db.studentProfiles.create({
      userId,
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
  } catch (error) {
    if (error.code === 11000) {
      return db.studentProfiles.findOne({ userId });
    }
    throw error;
  }
};

// @route   GET /api/profiles/student
// @desc    Get current student's profile
// @access  Private (Student only)
router.get('/student', authMiddleware, checkRole(['student']), async (req, res) => {
  let profile = await db.studentProfiles.findOne({ userId: req.user.id });

  if (!profile) {
    // Fallback: create an empty profile if not found
    profile = await createEmptyStudentProfile(req.user.id);
  }

  res.json(profile);
});

// @route   PUT /api/profiles/student
// @desc    Update student's profile manually
// @access  Private (Student only)
router.put('/student', authMiddleware, checkRole(['student']), async (req, res) => {
  const profile = await db.studentProfiles.findOne({ userId: req.user.id });

  if (!profile) {
    return res.status(404).json({ message: 'Profile not found' });
  }

  const updatedProfile = await db.studentProfiles.findByIdAndUpdate(profile.id, {
    skills: req.body.skills || profile.skills,
    education: req.body.education || profile.education,
    experience: req.body.experience || profile.experience,
    projects: req.body.projects || profile.projects,
    certifications: req.body.certifications || profile.certifications,
    atsScore: req.body.atsScore !== undefined ? req.body.atsScore : profile.atsScore,
    industryReadinessScore: req.body.industryReadinessScore !== undefined ? req.body.industryReadinessScore : profile.industryReadinessScore,
    suggestions: req.body.suggestions || profile.suggestions,
    missingSkills: req.body.missingSkills || profile.missingSkills
  });

  res.json(updatedProfile);
});

router.post('/student', authMiddleware, checkRole(['student']), async (req, res) => {
  const profile = await db.studentProfiles.findOne({ userId: req.user.id });

  if (!profile) {
    return res.status(404).json({ message: 'Profile not found' });
  }

  const updatedProfile = await db.studentProfiles.findByIdAndUpdate(profile.id, {
    skills: req.body.skills || profile.skills,
    education: req.body.education || profile.education,
    experience: req.body.experience || profile.experience,
    projects: req.body.projects || profile.projects,
    certifications: req.body.certifications || profile.certifications,
    atsScore: req.body.atsScore !== undefined ? req.body.atsScore : profile.atsScore,
    industryReadinessScore: req.body.industryReadinessScore !== undefined ? req.body.industryReadinessScore : profile.industryReadinessScore,
    suggestions: req.body.suggestions || profile.suggestions,
    missingSkills: req.body.missingSkills || profile.missingSkills
  });

  res.json(updatedProfile);
});

// @route   POST /api/profiles/student/resume
// @desc    Upload resume PDF and parse it using NLP/keyword matching
// @access  Private (Student only)
router.post('/student/resume', authMiddleware, checkRole(['student']), upload.single('resume'), async (req, res) => {
  const tempFilePath = req.file?.path;
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload a resume file' });
    }

    let profile = await db.studentProfiles.findOne({ userId: req.user.id });
    if (!profile) {
      profile = await createEmptyStudentProfile(req.user.id);
    }

    const extracted = await extractTextFromUpload(req.file);
    const text = extracted.text;

    if (!text) {
      return res.status(400).json({ message: 'Could not extract text from the uploaded file' });
    }

    // Run analyzer
    const analysis = parseResumeText(text);

    const resumeDir = path.join(__dirname, '..', 'uploads', 'resumes', req.user.id);
    await fs.mkdir(resumeDir, { recursive: true });

    const safeOriginalName = (req.file.originalname || 'resume').replace(/[^a-zA-Z0-9._-]/g, '_');
    const savedFileName = `${Date.now()}-${safeOriginalName}`;
    const savedPath = path.join(resumeDir, savedFileName);
    await fs.copyFile(tempFilePath, savedPath);

    const publicResumeUrl = `/uploads/resumes/${req.user.id}/${savedFileName}`;
    const uploadRecord = await db.uploads.create({
      userId: req.user.id,
      fileName: req.file.originalname,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      storagePath: savedPath,
      publicUrl: publicResumeUrl,
      extractedText: text,
      parsedSummary: analysis
    });

    const updatedProfile = await db.studentProfiles.findByIdAndUpdate(profile.id, {
      skills: analysis.skills,
      education: analysis.education,
      experience: analysis.experience,
      certifications: analysis.certifications,
      projects: analysis.projects,
      atsScore: analysis.atsScore,
      missingSkills: analysis.missingSkills,
      suggestions: analysis.suggestions,
      industryReadinessScore: analysis.industryReadinessScore,
      resumeUrl: publicResumeUrl,
      resumeText: text,
      resumeFile: {
        id: uploadRecord.id,
        fileName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        publicUrl: publicResumeUrl
      }
    });

    // Create notification for student
    await db.notifications.create({
      recipient: req.user.id,
      title: 'Resume Analyzed Successfully!',
      message: `Your resume was parsed. ATS Score: ${analysis.atsScore}%, Industry Readiness: ${analysis.industryReadinessScore}%`
    });

    res.json({
      message: 'Resume analyzed successfully',
      profile: updatedProfile,
      upload: uploadRecord
    });
  } catch (err) {
    console.error('Resume upload/parsing error:', err);
    res.status(500).json({ message: err.message || 'Error processing resume file.' });
  } finally {
    if (tempFilePath) {
      await fs.unlink(tempFilePath).catch(() => null);
    }
  }
});

module.exports = router;
