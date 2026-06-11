function calculateMatch(studentSkills, jobRequirements) {
  if (!jobRequirements || jobRequirements.length === 0) {
    return {
      matchScore: 75, // default baseline if job has no explicit requirements
      missingSkills: [],
      suggestions: ['Add project descriptions highlighting core technologies.']
    };
  }

  const studentSkillsLower = studentSkills.map(s => s.toLowerCase());
  const jobReqsLower = jobRequirements.map(r => r.toLowerCase());

  let matched = 0;
  const missingSkills = [];

  jobReqsLower.forEach(req => {
    // Check if the student has this exact skill, or if their skill contains it (or vice versa)
    const hasSkill = studentSkillsLower.some(skill => 
      skill === req || skill.includes(req) || req.includes(skill)
    );

    if (hasSkill) {
      matched++;
    } else {
      // Find the original casing from the job requirements
      const originalReq = jobRequirements.find(r => r.toLowerCase() === req) || req;
      missingSkills.push(originalReq);
    }
  });

  const matchRatio = matched / jobRequirements.length;
  let matchScore = Math.round(matchRatio * 100);

  // Boost score slightly if student has general skills
  if (studentSkillsLower.length > 5) {
    matchScore += 5;
  }
  
  // Cap at 100 and floor at 10
  matchScore = Math.max(10, Math.min(matchScore, 100));

  const suggestions = [];
  if (missingSkills.length > 0) {
    suggestions.push(`Acquire skills in: ${missingSkills.slice(0, 3).join(', ')}.`);
    suggestions.push('Showcase projects on your resume that utilize these missing technologies.');
  } else {
    suggestions.push('Your profile is highly compatible with this role! Highlight your strongest experiences in the interview.');
  }

  return {
    matchScore,
    missingSkills,
    suggestions
  };
}

module.exports = { calculateMatch };
