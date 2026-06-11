const SKILLS_DATABASE = [
  'javascript', 'typescript', 'react', 'redux', 'node.js', 'node', 'express', 'express.js',
  'mongodb', 'sql', 'mysql', 'postgresql', 'sqlite', 'html', 'css', 'tailwind', 'bootstrap',
  'python', 'django', 'flask', 'fastapi', 'java', 'spring boot', 'c++', 'c#', 'c',
  'ruby', 'rails', 'php', 'laravel', 'git', 'github', 'docker', 'kubernetes', 'aws',
  'azure', 'gcp', 'machine learning', 'deep learning', 'nlp', 'ai', 'data science',
  'excel', 'power bi', 'tableau', 'project management', 'agile', 'scrum', 'figma'
];

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function containsSkill(text, skill) {
  const escapedSkill = escapeRegExp(skill);
  const regex = new RegExp(`(^|[^a-z0-9])${escapedSkill}($|[^a-z0-9])`, 'i');
  return regex.test(text);
}

function parseResumeText(text) {
  const lowercaseText = text.toLowerCase();
  
  // 1. Extract Skills
  const foundSkills = [];
  SKILLS_DATABASE.forEach(skill => {
    if (containsSkill(lowercaseText, skill)) {
      foundSkills.push(skill);
    }
  });

  // 2. Extract Education
  const education = [];
  const eduKeywords = ['university', 'college', 'school', 'institute', 'bachelor', 'master', 'b.tech', 'm.tech', 'bca', 'mca', 'degree', 'diploma'];
  const lines = text.split('\n');
  
  lines.forEach(line => {
    const lowerLine = line.toLowerCase();
    if (eduKeywords.some(keyword => lowerLine.includes(keyword))) {
      // Clean line a bit
      const cleaned = line.trim();
      if (cleaned.length > 10 && cleaned.length < 150) {
        education.push(cleaned);
      }
    }
  });

  // 3. Extract Experience
  const experience = [];
  const expKeywords = ['intern', 'developer', 'engineer', 'manager', 'lead', 'analyst', 'designer', 'work experience', 'employment'];
  lines.forEach(line => {
    const lowerLine = line.toLowerCase();
    if (expKeywords.some(keyword => lowerLine.includes(keyword)) && !lowerLine.includes('education') && !lowerLine.includes('project')) {
      const cleaned = line.trim();
      if (cleaned.length > 15 && cleaned.length < 150) {
        experience.push(cleaned);
      }
    }
  });

  // 4. Extract Certifications
  const certifications = [];
  const certKeywords = ['certified', 'certification', 'certificate', 'coursera', 'udemy', 'nptel', 'aws certified'];
  lines.forEach(line => {
    const lowerLine = line.toLowerCase();
    if (certKeywords.some(keyword => lowerLine.includes(keyword))) {
      const cleaned = line.trim();
      if (cleaned.length > 10 && cleaned.length < 150) {
        certifications.push(cleaned);
      }
    }
  });

  // 5. Extract Projects
  const projects = [];
  const projKeywords = ['project', 'portfolio', 'application', 'developed a', 'built a'];
  lines.forEach(line => {
    const lowerLine = line.toLowerCase();
    if (projKeywords.some(keyword => lowerLine.includes(keyword)) && !lowerLine.includes('experience') && !lowerLine.includes('education')) {
      const cleaned = line.trim();
      if (cleaned.length > 15 && cleaned.length < 150) {
        projects.push(cleaned);
      }
    }
  });

  // 6. Calculate Score & Suggestions
  let atsScore = 40; // Base score
  const suggestions = [];

  if (foundSkills.length >= 8) {
    atsScore += 20;
  } else if (foundSkills.length >= 4) {
    atsScore += 10;
    suggestions.push('Add more technical and soft skills to improve matching relevance.');
  } else {
    suggestions.push('Add technical skills core to your field (e.g. languages, frameworks).');
  }

  if (experience.length >= 2) {
    atsScore += 15;
  } else if (experience.length === 1) {
    atsScore += 8;
    suggestions.push('Detail previous internship or project work under a dedicated Experience section.');
  } else {
    suggestions.push('No relevant work experience detected. Consider adding mock projects or student activities.');
  }

  if (projects.length >= 2) {
    atsScore += 15;
  } else {
    suggestions.push('Include at least 2 detailed projects showing technologies used, GitHub links, and outcomes.');
  }

  if (certifications.length >= 1) {
    atsScore += 10;
  } else {
    suggestions.push('Add industry-relevant certifications (e.g., AWS, freeCodeCamp, Udemy) to validate skills.');
  }

  // Cap ATS Score at 100
  atsScore = Math.min(atsScore, 100);

  // Industry Readiness Score based on completeness
  const industryReadinessScore = Math.round((atsScore * 0.8) + (foundSkills.length * 2));

  // Determine Missing Skills in standard developer list
  const standardSkills = ['javascript', 'react', 'node.js', 'sql', 'git'];
  const missingSkills = standardSkills.filter(s => !foundSkills.includes(s));

  return {
    skills: foundSkills,
    education: education.map(edu => ({ institution: edu })),
    experience: experience.map(exp => ({ position: exp, description: exp })),
    certifications,
    projects: projects.map(proj => ({ title: proj, description: proj })),
    atsScore,
    missingSkills,
    suggestions,
    industryReadinessScore: Math.min(industryReadinessScore, 100)
  };
}

module.exports = { parseResumeText };
