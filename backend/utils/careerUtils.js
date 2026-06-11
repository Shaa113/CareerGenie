const DEFAULT_PROFILE = {
  atsScore: 0,
  skills: [],
  certifications: [],
  appliedJobs: 0,
  projects: 0,
  githubActivity: 0,
  interviewScore: 0,
  skillAssessment: 0
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function computeCareerReadinessScore(profile = {}) {
  const p = { ...DEFAULT_PROFILE, ...profile };
  const ats = Number(p.atsScore || 0);
  const resumeQuality = Number(p.resumeQuality || p.industryReadinessScore || 0);
  const skills = Array.isArray(p.skills) ? p.skills.length : Number(p.skills || 0);
  const projects = Number(p.projects || 0);
  const certifications = Array.isArray(p.certifications) ? p.certifications.length : Number(p.certifications || 0);
  const github = Number(p.githubScore || p.githubActivity || 0);
  const assessment = Number(p.skillAssessment || p.assessmentScore || 0);
  const applications = Number(p.appliedJobs || 0);
  const successRate = Number(p.applicationSuccessRate || (applications ? Math.min(100, 40 + (applications * 2)) : 0));

  const skillScore = Math.min(skills, 10) * 10;
  const projectScore = Math.min(projects, 5) * 10;
  const certScore = Math.min(certifications, 5) * 10;

  const score =
    ats * 0.20 +
    resumeQuality * 0.15 +
    skillScore * 0.10 +
    projectScore * 0.10 +
    certScore * 0.10 +
    github * 0.15 +
    assessment * 0.10 +
    successRate * 0.10;

  return clamp(Math.round(score), 0, 100);
}

function formatSkillList(skills = []) {
  return skills.length ? skills.join(', ') : 'your current profile';
}

function generateCopilotReply(question = '', profile = {}) {
  const p = { ...DEFAULT_PROFILE, ...profile };
  const skillLine = formatSkillList(p.skills);
  const certificationLine = (p.certifications || []).length
    ? p.certifications.join(', ')
    : 'no certifications yet';
  const jobsApplied = Number(p.appliedJobs || 0);

  const lower = String(question).toLowerCase();

  if (lower.includes('ats score') || lower.includes('ats')) {
    return `Your current ATS score is ${p.atsScore}%. To improve it quickly, tighten your summary around core skills such as ${skillLine}, add measurable project outcomes, and align keywords from the roles you applied to (${jobsApplied} recent applications). If you are still below 80%, prioritize the strongest keywords from the job descriptions and mention your ${certificationLine} clearly in the top section of your resume.`;
  }

  if (lower.includes('skill') || lower.includes('learn next') || lower.includes('roadmap')) {
    return `Based on your profile, the best next skills for you are ${skillLine} plus practical system design and cloud fundamentals. If you want a near-term growth path, focus on one framework, one deployment skill, and one data/DB topic. Your current certification list (${certificationLine}) suggests you are already building depth in the right areas.`;
  }

  if (lower.includes('ready for') || lower.includes('sde')) {
    return `You are trending toward a solid ${p.atsScore >= 70 ? 'strong' : 'good'} readiness level. Your ATS score is ${p.atsScore}%, and your current profile should be enough to pursue internships and entry-level roles. Keep improving project depth, interview practice, and one high-impact certification to move into stronger SDE opportunities.`;
  }

  if (lower.includes('project') || lower.includes('build')) {
    return `A strong project stack for your current profile would be: 1) a full-stack application using ${skillLine}, 2) one deployment-focused project, and 3) one AI/automation project. This gives recruiters evidence of both execution and real-world impact, which is often more persuasive than a long list of buzzwords.`;
  }

  if (lower.includes('certification') || lower.includes('certificates')) {
    return `You already have ${certificationLine}. If you want to push your profile further, prioritize AWS, Azure, or SQL/React-focused credentials that align with the job types you are targeting. Certifications help when your project history is still growing.`;
  }

  if (lower.includes('dsa')) {
    return `Start with arrays, strings, linked lists, stacks, queues, hash maps, binary trees, recursion, sorting, and searching. Then practice two medium and one hard problem per week. Pair that with a short project review so your DSA practice stays relevant to role-specific interviews.`;
  }

  return `I can help you improve your application strategy. With your current ATS score (${p.atsScore}%), skills (${skillLine}), and ${jobsApplied} application focus areas, the highest-impact next step is to refine your resume keywords, add one project outcome, and keep practicing interview-style problem solving.`;
}

module.exports = {
  computeCareerReadinessScore,
  generateCopilotReply,
  clamp
};
