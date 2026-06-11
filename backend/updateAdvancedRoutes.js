const fs = require('fs');
const file = 'c:/Users/HP/disha_BU/backend/routes/advanced.js';
let content = fs.readFileSync(file, 'utf8');

// Copilot logic
content = content.replace(
  /'Make recommendations based on the student data, not broad career advice\.'\r?\n\s*\]\.join\('\\n'\);/g,
  `'Return ONLY a valid JSON object matching exactly this schema. Do NOT include markdown code blocks. Just raw JSON:',
      '{',
      '  "analysis": "A clean 2-sentence summary of their profile.",',
      '  "strengths": ["string"],',
      '  "weaknesses": ["string"],',
      '  "risks": ["string"],',
      '  "recommendations": ["string"],',
      '  "plan": ["Week 1: task", "Week 2: task", "Week 3: task", "Week 4: task"],',
      '  "readinessScore": number',
      '}'
    ].join('\\n');`
);

content = content.replace(
  /const answer = await callGemini\(prompt\);/g,
  `const rawAnswer = await callGemini(prompt);
    let parsedAnswer = { analysis: rawAnswer, strengths: [], weaknesses: [], risks: [], recommendations: [], plan: [], readinessScore: 0 };
    try {
      const jsonMatch = rawAnswer.match(/\\{[\\s\\S]*\\}/);
      if (jsonMatch) parsedAnswer = JSON.parse(jsonMatch[0]);
    } catch(e) {}`
);

content = content.replace(/answer,/g, 'answer: parsedAnswer,');
content = content.replace(/res\.json\(\{ answer, history: saved \}\);/g, 'res.json({ answer: parsedAnswer, history: saved });');

// Resume Tailoring Logic
content = content.replace(
  /'Return strict JSON with keys: matchPercentage, matchingSkills, missingSkills, keywordAnalysis, atsSuggestions, summary, skillsSection, projects, experienceDescriptions, tailoredResume\.',/g,
  `'Return ONLY a valid JSON object matching exactly this schema. Do NOT include markdown code blocks. Just raw JSON:',
      '{',
      '  "matchScore": number,',
      '  "missingKeywords": ["string"],',
      '  "recommendedSkills": ["string"],',
      '  "suggestedSummary": "string",',
      '  "suggestedProjects": ["string"],',
      '  "atsRecommendations": ["string"],',
      '  "recruiterPerspective": "string"',
      '}',`
);

content = content.replace(
  /const matchPercentage = Number\(parsed\?\.matchPercentage \|\| 0\);[\s\S]*?const version = await db\.resumeTailorVersions\.create/g,
  `const matchScore = Number(parsed?.matchScore || 0);
    const missingKeywords = Array.isArray(parsed?.missingKeywords) ? parsed.missingKeywords : [];
    const recommendedSkills = Array.isArray(parsed?.recommendedSkills) ? parsed.recommendedSkills : [];

    const version = await db.resumeTailorVersions.create`
);

content = content.replace(
  /afterVersion: \{[\s\S]*?\},/g,
  'afterVersion: parsed || {},'
);

content = content.replace(
  /matchPercentage,\r?\n\s*matchingSkills,\r?\n\s*missingSkills,\r?\n\s*keywordAnalysis,\r?\n\s*atsSuggestions,\r?\n\s*optimizedSummary: parsed\?\.summary \|\| '',\r?\n\s*optimizedSkills: parsed\?\.skillsSection \|\| '',\r?\n\s*optimizedProjects: parsed\?\.projects \|\| '',\r?\n\s*optimizedExperience: parsed\?\.experienceDescriptions \|\| \[\]/g,
  `matchScore,
      missingKeywords,
      recommendedSkills,
      suggestedSummary: parsed?.suggestedSummary || '',
      suggestedProjects: parsed?.suggestedProjects || [],
      atsRecommendations: parsed?.atsRecommendations || [],
      recruiterPerspective: parsed?.recruiterPerspective || ''`
);

// Assessment logic
content = content.replace(
  /const questions = \[[\s\S]*?\];\r?\n\r?\n\s*res\.json\(\{ skill, questions \}\);/g,
  `try {
    const prompt = [
      \`Generate exactly 5 multiple-choice questions to assess a software engineer's knowledge in \${skill}.\`,
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
    ].join('\\n');

    const raw = await callGemini(prompt);
    const jsonMatch = raw.match(/\\{[\\s\\S]*\\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;

    if (!parsed || !parsed.questions) throw new Error('Failed to parse AI response.');

    res.json({ skill, questions: parsed.questions });
  } catch (error) {
    logStability(\`Assessment generate failed: \${error.message}\`);
    res.status(500).json({ message: 'Failed to generate assessment. Please try again.' });
  }`
);

content = content.replace(
  /const \{ skill = 'Skill Assessment', answers = \[\] \} = req\.body;[\s\S]*?res\.status\(201\)\.json\(record\);/g,
  `const { skill = 'Skill Assessment', answers = [], questions = [] } = req.body;
  
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
      \`A student just completed a \${skill} assessment and scored \${rawScore}/10.\`,
      'Return ONLY a valid JSON object matching exactly this schema. Do NOT include markdown code blocks. Just raw JSON:',
      '{',
      '  "strengthAreas": ["string"],',
      '  "weakAreas": ["string"],',
      '  "learningRecommendations": ["string"],',
      '  "difficultyRating": "Beginner OR Intermediate OR Advanced",',
      '  "careerImpact": "string"',
      '}'
    ].join('\\n');

    const raw = await callGemini(prompt);
    const jsonMatch = raw.match(/\\{[\\s\\S]*\\}/);
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
    logStability(\`Assessment submit failed: \${error.message}\`);
    res.status(500).json({ message: 'Failed to score assessment.' });
  }`
);

// Readiness Radar Logic
content = content.replace(
  /const strengths = \[[\s\S]*?const snapshot = await db\.placementReadinessSnapshots\.create/g,
  `const getScoreDetails = (score, max, whyLow, whyHigh, howLow, howHigh, impactLow, impactHigh) => {
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

  const snapshot = await db.placementReadinessSnapshots.create`
);

content = content.replace(
  /res\.json\(\{\r?\n\s*score: readiness,\r?\n\s*label: readiness >= 80 \? 'Placement Ready' : readiness >= 60 \? 'On Track' : 'Needs Focus',\r?\n\s*metrics,\r?\n\s*strengths,\r?\n\s*weakAreas,\r?\n\s*recommendations,\r?\n\s*snapshot: snapshot \|\| null\r?\n\s*\}\);/g,
  `res.json({
    score: readiness,
    label: readiness >= 80 ? 'Placement Ready' : readiness >= 60 ? 'On Track' : 'Needs Focus',
    metrics,
    actionableMetrics,
    snapshot: snapshot || null
  });`
);

fs.writeFileSync(file, content);
console.log('Update complete.');
