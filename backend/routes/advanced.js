const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const db = require('../utils/dbStore');
const { authMiddleware, checkRole } = require('../middleware/auth');
const { computeCareerReadinessScore } = require('../utils/careerUtils');

const GEMINI_API_KEY = process.env.gemini_api_key || process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

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

const stabilityLogPath = path.join(__dirname, '..', 'data', 'stability.log');

const logStability = (message) => {
  try {
    fs.appendFileSync(stabilityLogPath, `${new Date().toISOString()} ${message}\n`, 'utf8');
  } catch {
    // Ignore logging failures.
  }
};

const fetchJson = async (url, headers = {}) => {
  const response = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': 'CareerGenie', ...headers } });
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new Error(data.message || data.error || 'GitHub request failed');
  }
  return data;
};

const parseGitHubUsername = (value) => {
  if (!value) return '';
  const clean = String(value).trim().replace(/\/+$/, '');
  const match = clean.match(/github\.com\/([^/]+)/i);
  return match ? match[1] : clean.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0];
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const average = (values) => {
  const valid = values.filter((value) => Number.isFinite(value) && value >= 0);
  if (!valid.length) return 0;
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
};

const callGemini = async (prompt) => {
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key is not configured.');
  }

  const candidateModels = [
    GEMINI_MODEL,
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-1.5-flash'
  ].filter((value, index, array) => value && array.indexOf(value) === index);

  let lastError = null;

  for (const model of candidateModels) {
    let response;
    try {
      response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 800 }
        })
      });
    } catch (error) {
      lastError = error;
      logStability(`Gemini fetch failed for ${model}: ${error.message}`);
      continue;
    }

    const data = await response.json().catch(() => ({}));
    if (response.ok) {
      return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    }

    const message = data.error?.message || 'Gemini request failed';
    lastError = new Error(message);
    logStability(`Gemini request failed for ${model}: ${message}`);

    if (!/not found|not supported/i.test(message)) {
      throw lastError;
    }
  }

  throw lastError || new Error('Gemini request failed');
};

const buildProfileContext = async (userId) => {
  const profile = await db.studentProfiles.findOne({ userId });
  const applications = await db.applications.find({ studentId: userId });
  const assessments = await db.skillAssessments.find({ userId });
  const github = await db.githubProfiles.findOne({ userId });
  const user = await db.users.findById(userId);

  const assessmentScores = assessments.map((entry) => Number(entry.score || 0));
  const acceptanceRate = applications.length
    ? Math.round((applications.filter((entry) => ['Accepted', 'Shortlisted'].includes(entry.status)).length / applications.length) * 100)
    : 0;
  const assessmentAverage = average(assessmentScores);

  const readiness = computeCareerReadinessScore({
    atsScore: Number(profile?.atsScore || 0),
    resumeQuality: Number(profile?.industryReadinessScore || 0),
    skills: Array.isArray(profile?.skills) ? profile.skills : [],
    certifications: Array.isArray(profile?.certifications) ? profile.certifications : [],
    projects: Array.isArray(profile?.projects) ? profile.projects.length : 0,
    githubScore: Number(github?.strengthScore || 0),
    assessmentScore: assessmentAverage,
    appliedJobs: applications.length,
    applicationSuccessRate: acceptanceRate,
    githubActivity: Number(github?.contributionScore || 0)
  });

  return {
    profile,
    applications,
    assessments,
    github,
    user,
    assessmentAverage,
    acceptanceRate,
    readiness
  };
};

router.get('/career/copilot/history', authMiddleware, checkRole(['student']), async (req, res) => {
  const history = await db.careerCopilotConversations.find({ userId: req.user.id });
  res.json((history || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 20));
});

router.post('/career/copilot/message', authMiddleware, checkRole(['student']), async (req, res) => {
  const { message } = req.body;
  if (!message || !String(message).trim()) {
    return res.status(400).json({ message: 'Please enter your career question.' });
  }

  try {
    const context = await buildProfileContext(req.user.id);
    const recentApplications = (context.applications || [])
      .slice(0, 3)
      .map((entry) => `${entry.job?.title || 'Unknown role'} (${entry.status || 'Unknown status'})`)
      .join(', ') || 'No recent applications';
    const prompt = [
      'You are CareerGenie AI Career Copilot. Use the student profile data below to answer in a practical, personalized way.',
      `Student: ${context.user?.name || 'Student'}`,
      `ATS Score: ${context.profile?.atsScore ?? 0}`,
      `Resume Quality: ${context.profile?.industryReadinessScore ?? 0}`,
      `Skills: ${(context.profile?.skills || []).join(', ') || 'No skills listed yet'}`,
      `Certifications: ${(context.profile?.certifications || []).join(', ') || 'No certifications listed yet'}`,
      `Projects: ${(context.profile?.projects || []).length || 0}`,
      `Applications: ${context.applications.length}`,
      `Recent Applications: ${recentApplications}`,
      `GitHub Strength Score: ${context.github?.strengthScore ?? 0}`,
      `GitHub Languages: ${(context.github?.topLanguages || []).join(', ') || 'No public language data yet'}`,
      `Assessment Average: ${Math.round(context.assessmentAverage || 0)}`,
      `Question: ${message}`,
      'Return a highly specific response that directly references the numeric signals above.',
      'Do not write generic filler. Give exactly these sections:',
      '1) What the profile is currently doing well.',
      '2) The 3 highest-impact next actions.',
      '3) Certifications to consider.',
      '4) Projects to build next.',
      '5) A 30-day learning roadmap.',
      'Make recommendations based on the student data, not broad career advice.'
    ].join('\n');

    const answer = await callGemini(prompt);

    const saved = await db.careerCopilotConversations.create({
      userId: req.user.id,
      userName: context.user?.name || 'Student',
      question: message,
      answer,
      profileSnapshot: {
        atsScore: context.profile?.atsScore || 0,
        resumeQuality: context.profile?.industryReadinessScore || 0,
        skills: context.profile?.skills || [],
        certifications: context.profile?.certifications || []
      }
    });

    res.json({ answer, history: saved });
  } catch (error) {
    logStability(`Copilot failed: ${error.message}`);
    res.status(500).json({ message: error.message || 'AI Career Copilot failed.' });
  }
});

router.get('/career/readiness', authMiddleware, checkRole(['student']), async (req, res) => {
  const context = await buildProfileContext(req.user.id);
  const readiness = context.readiness;
  const strengths = [
    readiness >= 70 ? 'Strong resume alignment and project evidence' : 'Resume alignment needs more role-specific keywords',
    context.github?.strengthScore >= 60 ? 'GitHub activity is contributing positively to your profile' : 'GitHub activity can be strengthened with more public repos',
    context.assessmentAverage >= 70 ? 'Assessment scores show solid technical confidence' : 'Skill assessments indicate a good area to improve'
  ].filter(Boolean);
  const weakAreas = [
    context.profile?.atsScore < 70 ? 'ATS score needs improvement.' : null,
    (context.profile?.certifications || []).length < 2 ? 'Add more certifications to improve credibility.' : null,
    context.github?.strengthScore < 50 ? 'GitHub activity needs more visible repositories or stars.' : null
  ].filter(Boolean);
  const recommendations = [
    'Tailor the summary and skills section using the job description.',
    'Publish one project with a clear impact statement and README.',
    'Complete another skill assessment and revisit your weak areas.'
  ];

  await db.placementReadinessSnapshots.create({
    userId: req.user.id,
    score: readiness,
    metrics: {
      atsScore: context.profile?.atsScore || 0,
      resumeQuality: context.profile?.industryReadinessScore || 0,
      githubScore: context.github?.strengthScore || 0,
      assessmentScore: Math.round(context.assessmentAverage || 0),
      certifications: (context.profile?.certifications || []).length,
      projects: (context.profile?.projects || []).length,
      applicationSuccessRate: context.acceptanceRate || 0
    },
    strengths,
    weakAreas,
    recommendations,
    createdAt: new Date().toISOString()
  }).catch(() => null);

  res.json({
    score: readiness,
    label: readiness >= 80 ? 'Career Ready' : readiness >= 60 ? 'On Track' : 'Needs Focus',
    strengths,
    weakAreas,
    suggestions: recommendations,
    recommendations,
    metrics: {
      atsScore: context.profile?.atsScore || 0,
      resumeQuality: context.profile?.industryReadinessScore || 0,
      githubScore: context.github?.strengthScore || 0,
      assessmentScore: Math.round(context.assessmentAverage || 0),
      certifications: (context.profile?.certifications || []).length,
      projects: (context.profile?.projects || []).length,
      applicationSuccessRate: context.acceptanceRate || 0
    },
    appliedJobs: context.applications.length,
    profile: context.profile || null,
    github: context.github || null,
    assessmentAverage: Math.round(context.assessmentAverage || 0),
    acceptanceRate: context.acceptanceRate || 0
  });
});

router.post('/github/analyze', authMiddleware, checkRole(['student']), async (req, res) => {
  try {
    const input = (req.body.username || req.body.profileUrl || '').trim();
    const username = parseGitHubUsername(input);
    if (!username) {
      return res.status(400).json({ message: 'Please provide a GitHub username or profile URL.' });
    }

    const profile = await fetchJson(`https://api.github.com/users/${username}`);
    const repos = await fetchJson(`https://api.github.com/users/${username}/repos?per_page=100&type=owner&sort=updated`);
    const events = await fetchJson(`https://api.github.com/users/${username}/events/public?per_page=30`).catch(() => []);

    const languageTotals = {};
    for (const repo of repos) {
      if (repo.language) {
        languageTotals[repo.language] = (languageTotals[repo.language] || 0) + 1;
      }
    }

    const topRepos = repos
      .sort((a, b) => (b.stargazers_count || 0) - (a.stargazers_count || 0) || (b.forks_count || 0) - (a.forks_count || 0))
      .slice(0, 6);

    const totalStars = repos.reduce((sum, repo) => sum + (repo.stargazers_count || 0), 0);
    const totalForks = repos.reduce((sum, repo) => sum + (repo.forks_count || 0), 0);
    const contributionScore = clamp(Math.round((profile.followers || 0) * 3 + totalStars * 1.5 + totalForks * 2 + repos.length * 4 + events.length * 2), 0, 100);

    const topLanguages = Object.entries(languageTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name]) => name);

    const payload = {
      userId: req.user.id,
      username,
      profileUrl: profile.html_url || `https://github.com/${username}`,
      profile,
      repos: topRepos,
      topLanguages,
      languages: Object.entries(languageTotals).sort((a, b) => b[1] - a[1]).slice(0, 8),
      starsEarned: totalStars,
      totalStars,
      forksCount: totalForks,
      contributionScore,
      strengthScore: contributionScore,
      repositoryCount: repos.length,
      followerCount: profile.followers || 0,
      followingCount: profile.following || 0,
      followers: profile.followers || 0,
      activityScore: events.length,
      highlights: [
        `${repos.length} public repositories`,
        `${totalStars} stars collected across top projects`,
        `${events.length} recent public activities`
      ],
      contributionSummary: `${repos.length} repositories • ${totalStars} stars • ${totalForks} forks • ${events.length} recent public activities`,
      analyzedAt: new Date().toISOString()
    };

    const existing = await db.githubProfiles.findOne({ userId: req.user.id });
    if (existing) {
      await db.githubProfiles.findByIdAndUpdate(existing.id, payload);
    } else {
      await db.githubProfiles.create(payload);
    }

    res.json(payload);
  } catch (error) {
    logStability(`GitHub analyze failed: ${error.message}`);
    res.status(422).json({ message: error.message || 'GitHub profile could not be fetched.' });
  }
});

router.get('/github/profile', authMiddleware, checkRole(['student']), async (req, res) => {
  const record = await db.githubProfiles.findOne({ userId: req.user.id });
  res.json(record || null);
});

router.post('/resume/tailor', authMiddleware, checkRole(['student']), async (req, res) => {
  const { targetRole, jobDescription } = req.body;
  const profile = await db.studentProfiles.findOne({ userId: req.user.id });
  const resumeText = profile?.resumeText || '';

  if (!resumeText || !targetRole || !jobDescription) {
    return res.status(400).json({ message: 'Resume text, target role, and job description are required.' });
  }

  try {
    const prompt = [
      'You are CareerGenie AI Resume Tailor. Rewrite the resume text for the target role using the job description and keep it realistic.',
      'Return strict JSON with keys: matchPercentage, matchingSkills, missingSkills, keywordAnalysis, atsSuggestions, summary, skillsSection, projects, experienceDescriptions, tailoredResume.',
      'Resume text:\n' + resumeText,
      'Target Role:\n' + targetRole,
      'Job Description:\n' + jobDescription
    ].join('\n');

    const raw = await callGemini(prompt);
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;

    const matchPercentage = Number(parsed?.matchPercentage || 0);
    const missingSkills = Array.isArray(parsed?.missingSkills) ? parsed.missingSkills : [];
    const matchingSkills = Array.isArray(parsed?.matchingSkills) ? parsed.matchingSkills : [];
    const keywordAnalysis = parsed?.keywordAnalysis || 'Extracted keywords from the job post and resume context.';
    const atsSuggestions = Array.isArray(parsed?.atsSuggestions) ? parsed.atsSuggestions : [];

    const version = await db.resumeTailorVersions.create({
      userId: req.user.id,
      targetRole,
      jobDescription,
      beforeVersion: {
        resumeText,
        skills: profile?.skills || [],
        certifications: profile?.certifications || []
      },
      afterVersion: {
        summary: parsed?.summary || '',
        skillsSection: parsed?.skillsSection || '',
        projects: parsed?.projects || '',
        experienceDescriptions: parsed?.experienceDescriptions || [],
        tailoredResume: parsed?.tailoredResume || raw,
        matchPercentage,
        matchingSkills,
        missingSkills,
        keywordAnalysis,
        atsSuggestions
      },
      generatedAt: new Date().toISOString()
    });

    res.json({
      message: 'Resume tailored successfully.',
      matchPercentage,
      matchingSkills,
      missingSkills,
      keywordAnalysis,
      atsSuggestions,
      optimizedSummary: parsed?.summary || '',
      optimizedSkills: parsed?.skillsSection || '',
      optimizedProjects: parsed?.projects || '',
      optimizedExperience: parsed?.experienceDescriptions || [],
      version,
      beforeVersion: version.beforeVersion,
      afterVersion: version.afterVersion
    });
  } catch (error) {
    logStability(`Resume tailor failed: ${error.message}`);
    res.status(500).json({ message: error.message || 'AI Resume Tailor failed.' });
  }
});

router.get('/resume/versions', authMiddleware, checkRole(['student']), async (req, res) => {
  const versions = await db.resumeTailorVersions.find({ userId: req.user.id });
  res.json((versions || []).sort((a, b) => new Date(b.generatedAt) - new Date(a.generatedAt)));
});

router.post('/resume/rollback/:id', authMiddleware, checkRole(['student']), async (req, res) => {
  const version = await db.resumeTailorVersions.findById(req.params.id);
  if (!version || version.userId !== req.user.id) {
    return res.status(404).json({ message: 'Resume version not found.' });
  }

  const profile = await db.studentProfiles.findOne({ userId: req.user.id });
  if (!profile) {
    return res.status(404).json({ message: 'Profile not found.' });
  }

  await db.studentProfiles.findByIdAndUpdate(profile.id, {
    resumeText: version.beforeVersion?.resumeText || profile.resumeText
  });

  res.json({ message: 'Restored previous resume version.', version });
});

router.get('/placement/readiness', authMiddleware, checkRole(['student']), async (req, res) => {
  const context = await buildProfileContext(req.user.id);

  const readiness = context.readiness;
  const metrics = {
    atsScore: context.profile?.atsScore || 0,
    resumeQuality: context.profile?.industryReadinessScore || 0,
    githubScore: context.github?.strengthScore || 0,
    assessmentScore: Math.round(context.assessmentAverage || 0),
    certifications: (context.profile?.certifications || []).length,
    projects: (context.profile?.projects || []).length,
    applicationSuccessRate: context.acceptanceRate || 0
  };

  const strengths = [
    metrics.atsScore >= 70 ? 'Resume ATS strength' : 'ATS strength needs keyword optimization',
    metrics.githubScore >= 50 ? 'GitHub activity is visible' : 'GitHub contribution volume needs to improve',
    metrics.assessmentScore >= 70 ? 'Assessment performance is strong' : 'Assessment performance can improve with more practice'
  ].filter(Boolean);

  const weakAreas = [
    metrics.resumeQuality < 70 ? 'Resume quality requires stronger project and skill evidence' : null,
    metrics.certifications < 2 ? 'Add a relevant certification' : null,
    metrics.projects < 2 ? 'Create at least two project showcases' : null
  ].filter(Boolean);

  const recommendations = [
    'Refine resume keywords using the target role description.',
    'Build one public project with measurable impact and README details.',
    'Use the skill assessment results to practice the weakest area.'
  ];

  const snapshot = await db.placementReadinessSnapshots.create({
    userId: req.user.id,
    score: readiness,
    metrics,
    strengths,
    weakAreas,
    recommendations,
    createdAt: new Date().toISOString()
  }).catch(() => null);

  res.json({
    score: readiness,
    label: readiness >= 80 ? 'Placement Ready' : readiness >= 60 ? 'On Track' : 'Needs Focus',
    metrics,
    strengths,
    weakAreas,
    recommendations,
    snapshot: snapshot || null
  });
});

router.get('/assessments', authMiddleware, checkRole(['student']), async (req, res) => {
  const records = await db.skillAssessments.find({ userId: req.user.id });
  res.json((records || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
});

router.post('/assessments/generate', authMiddleware, checkRole(['student']), async (req, res) => {
  const skill = String(req.body.skill || 'Software Development').trim();
  const questions = [
    { id: 'q1', prompt: `Explain what ${skill} means in one practical sentence and why it matters in hiring.` },
    { id: 'q2', prompt: `List two common tools, libraries, or frameworks used with ${skill}.` },
    { id: 'q3', prompt: `Describe one real-world project scenario where ${skill} would be useful.` },
    { id: 'q4', prompt: `What are two metrics or outcomes you would highlight when presenting ${skill} in an interview?` },
    { id: 'q5', prompt: `What is one gap you still want to improve in ${skill} after your current projects?` }
  ];

  res.json({ skill, questions });
});

router.post('/assessments/submit', authMiddleware, checkRole(['student']), async (req, res) => {
  const { skill = 'Skill Assessment', answers = [] } = req.body;
  const total = Math.max(1, answers.length);

  const score = clamp(
    answers.reduce((sum, answer) => {
      const text = String(answer.answer || '');
      const words = text.trim().split(/\s+/).filter(Boolean).length;
      const keywordBoost = text.toLowerCase().includes(String(skill).toLowerCase()) ? 8 : 0;
      return sum + clamp(6 + words * 2 + keywordBoost, 0, 20);
    }, 0) / total,
    0,
    100
  );

  const strengths = score >= 70 ? ['You clearly understand the core concepts and can explain them in practical terms.'] : ['Focus on adding more concrete examples and measurable outcomes to your answers.'];
  const weaknesses = score < 70 ? ['Provide stronger examples from projects or internships.'] : [];

  const record = await db.skillAssessments.create({
    userId: req.user.id,
    skill,
    score: Math.round(score),
    strengths,
    weaknesses,
    completedAt: new Date().toISOString(),
    answers
  });

  res.status(201).json(record);
});

module.exports = router;
