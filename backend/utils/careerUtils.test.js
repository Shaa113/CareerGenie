const test = require('node:test');
const assert = require('node:assert/strict');

const { computeCareerReadinessScore, generateCopilotReply } = require('./careerUtils');

test('computeCareerReadinessScore uses ATS and profile signals', () => {
  const score = computeCareerReadinessScore({ atsScore: 76, projects: 4, certifications: 2, githubActivity: 72, interviewScore: 68, skillAssessment: 80 });
  assert.ok(score >= 70);
  assert.ok(score <= 100);
});

test('generateCopilotReply gives personalized guidance for ATS improvement', () => {
  const reply = generateCopilotReply('How can I improve my ATS score?', {
    atsScore: 65,
    skills: ['react', 'node.js'],
    certifications: ['AWS'],
    appliedJobs: ['Frontend Developer']
  });

  assert.match(reply, /ATS/i);
  assert.match(reply, /react|node\.js|AWS/i);
});
