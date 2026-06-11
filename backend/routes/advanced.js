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
      'Return ONLY a valid JSON object matching exactly this schema. Do NOT include markdown code blocks (```json) around the output. Just raw JSON:',
      '{',
      '  "analysis": "A clean 2-sentence summary of their profile.",',
      '  "strengths": ["string"],',
      '  "weaknesses": ["string"],',
      '  "risks": ["string"],',
      '  "recommendations": ["string"],',
      '  "plan": ["Week 1: task", "Week 2: task", "Week 3: task", "Week 4: task"],',
      '  "readinessScore": number',
      '}'
    ].join('\n');

    const rawAnswer = await callGemini(prompt);
    let parsedAnswer = { analysis: rawAnswer, strengths: [], weaknesses: [], risks: [], recommendations: [], plan: [], readinessScore: 0 };
    try {
      const jsonMatch = rawAnswer.match(/\{[\s\S]*\}/);
      if (jsonMatch) parsedAnswer = JSON.parse(jsonMatch[0]);
    } catch(e) {}

    const saved = await db.careerCopilotConversations.create({
      userId: req.user.id,
      userName: context.user?.name || 'Student',
      question: message,
      answer: parsedAnswer,
      profileSnapshot: {
        atsScore: context.profile?.atsScore || 0,
        resumeQuality: context.profile?.industryReadinessScore || 0,
        skills: context.profile?.skills || [],
        certifications: context.profile?.certifications || []
      }
    });

    res.json({ answer: parsedAnswer, history: saved });
  } catch (error) {
    logStability(`Copilot failed: ${error.message}`);
    res.status(500).json({ message: error.message || 'AI Career Copilot failed.' });
  }
});

router.get('/career/readiness', authMiddleware, checkRole(['student']), async (req, res) => {
  const context = await buildProfileContext(req.user.id);
  const readiness = context.readiness;
  const getScoreDetails = (score, max, whyLow, whyHigh, howLow, howHigh, impactLow, impactHigh) => {
    const isGood = score >= max * 0.7;
    return {
      score: Math.round(score),
      why: isGood ? whyHigh : whyLow,
      how: isGood ? howHigh : howLow,
      impact: isGood ? impactHigh : impactLow
    };
  };

  const actionableMetrics = {
    atsScore: getScoreDetails(
      metrics.atsScore, 100, 
      'Resume lacks role-specific keywords and proper formatting.', 'ATS matching is strong.', 
      ['Include keywords from target jobs', 'Use standard section headings'], ['Maintain current quality', 'Update with new skills'], 
      '+15 readiness points', 'Steady'
    ),
    resumeQuality: getScoreDetails(
      metrics.resumeQuality, 100, 
      'Project descriptions and impact statements are weak.', 'Experience and projects are well-documented.', 
      ['Rewrite bullets with the STAR method', 'Add numeric metrics'], ['Keep metrics updated'], 
      '+10 readiness points', 'Steady'
    ),
    githubScore: getScoreDetails(
      metrics.githubScore, 100, 
      'Low repository count or missing public activity.', 'Consistent public contributions.', 
      ['Push code regularly', 'Add detailed README files'], ['Start an open source contribution'], 
      '+15 readiness points', 'Steady'
    ),
    assessmentScore: getScoreDetails(
      metrics.assessmentScore, 100, 
      'Low scores on technical skill evaluations.', 'Demonstrates strong technical competence.', 
      ['Take more skill tests', 'Review weak areas'], ['Take advanced level tests'], 
      '+10 readiness points', 'Steady'
    )
  };

  const strengths = [];
  const weakAreas = [];
  const recommendations = [];

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
    actionableMetrics,
    snapshot: snapshot || null
  });
});

router.get('/assessments', authMiddleware, checkRole(['student']), async (req, res) => {
  const records = await db.skillAssessments.find({ userId: req.user.id });
  res.json((records || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
});

router.post('/assessments/generate', authMiddleware, checkRole(['student']), async (req, res) => {
  const skill = String(req.body.skill || 'Software Development').trim();
  try {
    const prompt = [
      `Generate exactly 5 multiple-choice questions to assess a software engineer's knowledge in ${skill}.`,
      'Return ONLY a valid JSON object matching exactly this schema. Do NOT include markdown code blocks. Just raw JSON:',
      '{',
      '  "questions": [',
      '    {',
      '      "id": "q1",',
      '      "prompt": "The question text?",',
      '      "options": ["A", "B", "C", "D"],',
      '      "answerIndex": 0',
      '    }',
      '  ]',
      '}'
    ].join('\n');

    const raw = await callGemini(prompt);
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;

    if (!parsed || !parsed.questions) throw new Error('Failed to parse AI response.');

    res.json({ skill, questions: parsed.questions });
  } catch (error) {
    logStability(`Assessment generate failed: ${error.message}`);
    res.status(500).json({ message: 'Failed to generate assessment. Please try again.' });
  }
});

router.post('/assessments/submit', authMiddleware, checkRole(['student']), async (req, res) => {
  const { skill = 'Skill Assessment', answers = [], questions = [] } = req.body;
  
  if (!questions.length || !answers.length) {
    return res.status(400).json({ message: 'Missing questions or answers.' });
  }

  let correctCount = 0;
  questions.forEach(q => {
    const studentAnswer = answers.find(a => a.id === q.id || a.question === q.prompt);
    if (studentAnswer && studentAnswer.answer === q.options[q.answerIndex]) {
      correctCount++;
    }
  });

  const rawScore = (correctCount / questions.length) * 10;

  try {
    const prompt = [
      `A student just completed a ${skill} assessment and scored ${rawScore}/10.`,
      'Return ONLY a valid JSON object matching exactly this schema. Do NOT include markdown code blocks. Just raw JSON:',
      '{',
      '  "strengthAreas": ["string"],',
      '  "weakAreas": ["string"],',
      '  "learningRecommendations": ["string"],',
      '  "difficultyRating": "Beginner OR Intermediate OR Advanced",',
      '  "careerImpact": "string"',
      '}'
    ].join('\n');

    const raw = await callGemini(prompt);
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

    const record = await db.skillAssessments.create({
      userId: req.user.id,
      skill,
      score: Math.round((rawScore / 10) * 100),
      strengths: parsed.strengthAreas || [],
      weaknesses: parsed.weakAreas || [],
      completedAt: new Date().toISOString(),
      details: parsed
    });

    res.status(201).json(record);
  } catch (error) {
    logStability(`Assessment submit failed: ${error.message}`);
    res.status(500).json({ message: 'Failed to score assessment.' });
  }
});

module.exports = router;
