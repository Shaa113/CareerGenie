import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Upload, ChevronRight, X, Edit2, Loader2, AlertCircle, Sparkles, GitBranch, Target, Brain, ShieldCheck, Activity } from 'lucide-react';
import { apiCall } from '../utils/api';
import { JOBS_UPDATED_EVENT_NAME } from '../utils/jobSync';
import { BarChart, Bar, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export default function StudentDashboard() {
  const [profile, setProfile] = useState(null);
  const [applications, setApplications] = useState([]);
  const [jobMatches, setJobMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [error, setError] = useState(null);
  const [readinessData, setReadinessData] = useState(null);
  const [copilotQuestion, setCopilotQuestion] = useState('');
  const [copilotAnswer, setCopilotAnswer] = useState('');
  const [copilotHistory, setCopilotHistory] = useState([]);
  const [githubUsername, setGithubUsername] = useState('');
  const [githubProfile, setGithubProfile] = useState(null);
  const [assessments, setAssessments] = useState([]);
  const [advancedLoading, setAdvancedLoading] = useState(false);
  const [tailorRole, setTailorRole] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [tailorResult, setTailorResult] = useState(null);
  const [tailoringLoading, setTailoringLoading] = useState(false);
  const [assessmentPromptSkill, setAssessmentPromptSkill] = useState('');
  const [assessmentQuestions, setAssessmentQuestions] = useState([]);
  const [assessmentAnswers, setAssessmentAnswers] = useState({});
  const [assessmentResult, setAssessmentResult] = useState(null);

  // Edit form states
  const [skillsText, setSkillsText] = useState('');
  const [newCert, setNewCert] = useState('');
  const [certsList, setCertsList] = useState([]);

  const githubLanguageChart = useMemo(() => {
    const languages = Array.isArray(githubProfile?.languages) ? githubProfile.languages : [];
    return languages
      .map(([name, count]) => ({ name, count: Number(count || 0) }))
      .filter((entry) => entry.name && entry.count > 0);
  }, [githubProfile]);

  const githubRepoChart = useMemo(() => {
    const repos = Array.isArray(githubProfile?.repos) ? githubProfile.repos : [];
    return repos.slice(0, 5).map((repo) => ({
      name: repo.name,
      stars: Number(repo.stargazers_count || 0),
      forks: Number(repo.forks_count || 0),
      language: repo.language || 'Unknown'
    }));
  }, [githubProfile]);

  const loadAdvancedFeatures = useCallback(async () => {
    try {
      const [readiness, github, assessmentItems, history] = await Promise.all([
        apiCall('/advanced/career/readiness'),
        apiCall('/advanced/github/profile'),
        apiCall('/advanced/assessments'),
        apiCall('/advanced/career/copilot/history')
      ]);

      setReadinessData(readiness);
      setGithubProfile(github);
      setAssessments(assessmentItems || []);
      setCopilotHistory(history || []);
      if (github?.username) {
        setGithubUsername(github.username);
      }
    } catch (err) {
      console.warn('Advanced feature data unavailable:', err);
    }
  }, []);

  const fetchData = useCallback(async ({ showLoading = true } = {}) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      const [studentProfile, apps, jobs] = await Promise.all([
        apiCall('/profiles/student'),
        apiCall('/applications/student'),
        apiCall('/jobs')
      ]);

      setProfile(studentProfile);
      setSkillsText((studentProfile.skills || []).join(', '));
      setCertsList(studentProfile.certifications || []);
      setApplications(apps);
      setJobMatches(jobs.slice(0, 4));
      setError(null);
      await loadAdvancedFeatures();
    } catch (err) {
      console.error(err);
      setError('Failed to fetch dashboard data. Please try again.');
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, [loadAdvancedFeatures]);

  useEffect(() => {
    const syncDashboard = () => {
      void fetchData({ showLoading: false });
    };

    const timer = window.setTimeout(() => {
      void fetchData({ showLoading: true });
    }, 0);

    const handleJobsUpdated = () => syncDashboard();
    const handleStorage = (event) => {
      if (event.key === 'careergenie:jobs-updated') {
        syncDashboard();
      }
    };

    window.addEventListener(JOBS_UPDATED_EVENT_NAME, handleJobsUpdated);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(JOBS_UPDATED_EVENT_NAME, handleJobsUpdated);
      window.removeEventListener('storage', handleStorage);
    };
  }, [fetchData]);

  const handleResumeUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('resume', file);

    setUploading(true);
    setError(null);

    try {
      const result = await apiCall('/profiles/student/resume', 'POST', formData, true);
      setProfile(result.profile);
      setSkillsText(result.profile.skills.join(', '));
      setCertsList(result.profile.certifications || []);
      
      // Refresh applications and job matches to reflect new skills
      const apps = await apiCall('/applications/student');
      setApplications(apps);
      const jobs = await apiCall('/jobs');
      setJobMatches(jobs.slice(0, 4));
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error processing resume file.');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    const skillsArray = skillsText.split(',').map(s => s.trim()).filter(Boolean);
    
    try {
      const updated = await apiCall('/profiles/student', 'POST', {
        skills: skillsArray,
        certifications: certsList
      });
      setProfile(updated);
      setShowEditModal(false);
      
      // Refresh jobs board matches
      const jobs = await apiCall('/jobs');
      setJobMatches(jobs.slice(0, 4));
    } catch (err) {
      console.error(err);
      setError('Failed to update profile.');
    }
  };

  const addCert = () => {
    if (newCert.trim()) {
      setCertsList([...certsList, newCert.trim()]);
      setNewCert('');
    }
  };

  const removeCert = (idx) => {
    setCertsList(certsList.filter((_, i) => i !== idx));
  };

  const handleAskCopilot = async (e) => {
    e.preventDefault();
    if (!copilotQuestion.trim()) return;

    try {
      setAdvancedLoading(true);
      const result = await apiCall('/advanced/career/copilot/message', 'POST', { message: copilotQuestion });
      setCopilotAnswer(result.answer || 'I can help you plan your next move.');
      setCopilotQuestion('');
      const history = await apiCall('/advanced/career/copilot/history');
      setCopilotHistory(history || []);
    } catch (err) {
      setError(err.message || 'Copilot request failed.');
    } finally {
      setAdvancedLoading(false);
    }
  };

  const handleConnectGithub = async () => {
    if (!githubUsername.trim()) return;

    try {
      setAdvancedLoading(true);
      const result = await apiCall('/advanced/github/analyze', 'POST', { username: githubUsername.trim() });
      setGithubProfile(result);
      setError(null);
      const readiness = await apiCall('/advanced/career/readiness');
      setReadinessData(readiness);
    } catch (err) {
      setError(err.message || 'GitHub integration failed.');
    } finally {
      setAdvancedLoading(false);
    }
  };

  const handleTailorResume = async (e) => {
    e.preventDefault();
    if (!tailorRole.trim() || !jobDescription.trim()) {
      setError('Enter a target role and job description to tailor your resume.');
      return;
    }

    try {
      setTailoringLoading(true);
      const result = await apiCall('/advanced/resume/tailor', 'POST', {
        targetRole: tailorRole.trim(),
        jobDescription: jobDescription.trim()
      });
      setTailorResult(result);
      setError(null);
    } catch (err) {
      setError(err.message || 'Resume tailoring failed.');
    } finally {
      setTailoringLoading(false);
    }
  };

  const handleRollbackVersion = async () => {
    if (!tailorResult?.version?.id) return;

    try {
      const result = await apiCall(`/advanced/resume/rollback/${tailorResult.version.id}`, 'POST');
      setError(null);
      alert(result.message || 'Rolled back to the previous version.');
    } catch (err) {
      setError(err.message || 'Rollback failed.');
    }
  };

  const handleGenerateAssessment = async (e) => {
    e.preventDefault();
    const skill = (assessmentPromptSkill || profile?.skills?.[0] || 'Software Development').trim();
    try {
      setAdvancedLoading(true);
      const result = await apiCall('/advanced/assessments/generate', 'POST', { skill });
      setAssessmentQuestions(result.questions || []);
      setAssessmentAnswers({});
      setAssessmentResult(null);
      setAssessmentPromptSkill(skill);
    } catch (err) {
      setError(err.message || 'Assessment questions could not be generated.');
    } finally {
      setAdvancedLoading(false);
    }
  };

  const handleSubmitAssessment = async (e) => {
    e.preventDefault();
    if (!assessmentQuestions.length) {
      setError('Generate assessment questions first.');
      return;
    }

    const answers = assessmentQuestions.map((question) => ({
      question: question.prompt,
      answer: assessmentAnswers[question.id] || ''
    }));

    try {
      setAdvancedLoading(true);
      const result = await apiCall('/advanced/assessments/submit', 'POST', {
        skill: assessmentPromptSkill,
        answers
      });
      setAssessmentResult(result);
      setAssessments((prev) => [result, ...prev]);
      const readiness = await apiCall('/advanced/career/readiness');
      setReadinessData(readiness);
    } catch (err) {
      setError(err.message || 'Assessment submission failed.');
    } finally {
      setAdvancedLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-80px)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'Accepted': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'Shortlisted': return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
      case 'Reviewing': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'Rejected': return 'bg-red-500/10 text-red-400 border-red-500/20';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Error Alert */}
      {error && (
        <div className="lg:col-span-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Left Column: Profile Card */}
      <div className="space-y-6">
        <div className="glass-panel p-6 rounded-2xl border border-white/5 relative">
          <button 
            onClick={() => setShowEditModal(true)}
            className="absolute top-4 right-4 p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <Edit2 className="w-4 h-4" />
          </button>

          <div className="flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-indigo-600/20 text-indigo-400 rounded-full flex items-center justify-center font-bold text-3xl mb-4 border border-indigo-500/30">
              <FileText className="w-10 h-10" />
            </div>
            <h2 className="text-xl font-bold text-white">Your Profile</h2>
            <p className="text-slate-400 text-xs mt-1">Manage resume & skills</p>
          </div>

          <div className="mt-6 space-y-4 border-t border-white/5 pt-6 text-left">
            <div>
              <h4 className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Skills</h4>
              {profile?.skills.length === 0 ? (
                <p className="text-slate-500 text-xs mt-1">No skills added yet.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {profile?.skills.map((skill, idx) => (
                    <span key={idx} className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-[10px] font-semibold uppercase">
                      {skill}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h4 className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Certifications</h4>
              {profile?.certifications?.length === 0 ? (
                <p className="text-slate-500 text-xs mt-1">No certifications listed.</p>
              ) : (
                <ul className="list-disc pl-4 text-slate-300 text-xs mt-1.5 space-y-1">
                  {profile?.certifications?.map((cert, idx) => (
                    <li key={idx}>{cert}</li>
                  ))}
                </ul>
              )}
            </div>

            {profile?.resumeUrl && (
              <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between text-xs mt-2">
                <span className="text-slate-300 truncate max-w-[200px]">
                  {profile?.resumeFile?.fileName || profile.resumeUrl.split('/').pop()}
                </span>
                <span className="text-[10px] text-emerald-400 font-bold">PARSED</span>
              </div>
            )}
          </div>
        </div>

        {/* Support Ticket / Complaint */}
        <div className="glass-panel p-6 rounded-2xl border border-white/5 text-left">
          <h3 className="text-sm font-bold text-white mb-2">Need Support?</h3>
          <p className="text-slate-400 text-xs leading-relaxed mb-4">
            Having problems with resume parsing or job matching? File a support request.
          </p>
          <Link
            to="/dashboard/student"
            onClick={() => {
              const title = prompt('Enter ticket title:');
              const description = prompt('Describe the issue:');
              if (title && description) {
                apiCall('/admin/complaints', 'POST', { title, description })
                  .then(() => alert('Ticket submitted successfully!'))
                  .catch(err => alert(err.message));
              }
            }}
            className="inline-flex items-center text-xs text-indigo-400 font-semibold hover:underline"
          >
            File a Ticket
          </Link>
        </div>
      </div>

      {/* Center Column: ATS Stats & Job Matches */}
      <div className="lg:col-span-2 space-y-6 text-left">
        {/* Resume Analyzer / Score Dashboard */}
        <div className="glass-panel p-6 rounded-2xl border border-white/5">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-white">AI Resume Insights</h3>
              <p className="text-slate-400 text-xs max-w-md">
                Upload your resume PDF to measure industry readiness, calculate your ATS score, and receive personalized suggestions.
              </p>
              
              <div className="pt-2 flex items-center gap-4">
                <label className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg cursor-pointer transition-colors shadow-lg shadow-indigo-600/10">
                  {uploading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Upload className="w-3.5 h-3.5" />
                  )}
                  <span>Upload Resume (PDF)</span>
                  <input 
                    type="file" 
                    accept=".pdf,.docx,.txt,image/*" 
                    className="hidden" 
                    onChange={handleResumeUpload}
                    disabled={uploading}
                  />
                </label>
                
                {profile?.atsScore > 0 && (
                  <Link 
                    to="/resume" 
                    className="text-xs text-indigo-400 font-semibold hover:underline flex items-center gap-1"
                  >
                    View Detailed Suggestions <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            </div>

            {/* ATS Score Progress Circles */}
            <div className="flex gap-6 items-center shrink-0">
              <div className="flex flex-col items-center">
                <div className="relative w-24 h-24 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="48" cy="48" r="40" stroke="rgba(255,255,255,0.05)" strokeWidth="8" fill="transparent" />
                    <circle cx="48" cy="48" r="40" stroke="rgb(99, 102, 241)" strokeWidth="8" fill="transparent" 
                      strokeDasharray={251.2}
                      strokeDashoffset={251.2 - (251.2 * (profile?.atsScore || 0)) / 100}
                    />
                  </svg>
                  <span className="absolute text-xl font-bold text-white">{profile?.atsScore || 0}%</span>
                </div>
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mt-2">ATS Score</span>
              </div>

              <div className="flex flex-col items-center">
                <div className="relative w-24 h-24 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="48" cy="48" r="40" stroke="rgba(255,255,255,0.05)" strokeWidth="8" fill="transparent" />
                    <circle cx="48" cy="48" r="40" stroke="rgb(168, 85, 247)" strokeWidth="8" fill="transparent" 
                      strokeDasharray={251.2}
                      strokeDashoffset={251.2 - (251.2 * (profile?.industryReadinessScore || 0)) / 100}
                    />
                  </svg>
                  <span className="absolute text-xl font-bold text-white">{profile?.industryReadinessScore || 0}%</span>
                </div>
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mt-2">Readiness</span>
              </div>
            </div>
          </div>
        </div>

        {/* Job Matches & Application Tracker */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass-panel p-6 rounded-2xl border border-white/5 flex flex-col">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center justify-between">
              <span>Smart Matches</span>
              <Link to="/jobs" className="text-[11px] text-indigo-400 hover:underline">View All</Link>
            </h3>

            <div className="space-y-3 flex-1">
              {jobMatches.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-500">
                  No jobs found.
                </div>
              ) : (
                jobMatches.map((job) => (
                  <Link
                    key={job.id}
                    to={`/jobs/${job.id}`}
                    className="p-3 rounded-xl bg-white/5 border border-white/5 hover:border-indigo-500/20 block transition-all group"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-xs font-bold text-white group-hover:text-indigo-400 transition-colors">{job.title}</h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">{job.company} &bull; {job.location}</p>
                      </div>
                      {job.matchScore !== null && (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          job.matchScore >= 80 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                          job.matchScore >= 50 ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' :
                          'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}>
                          {job.matchScore}% Match
                        </span>
                      )}
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-white/5 flex flex-col">
            <h3 className="text-sm font-bold text-white mb-4">Applied Positions</h3>

            <div className="space-y-3 flex-1 overflow-y-auto max-h-[220px]">
              {applications.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500">
                  You haven't applied to any jobs yet.
                </div>
              ) : (
                applications.map((app) => (
                  <div key={app.id} className="p-3 rounded-xl bg-white/5 border border-white/5">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-xs font-bold text-white">{app.job.title}</h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">{app.job.company}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${getStatusColor(app.status)}`}>
                        {app.status}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-2.5 pt-2 border-t border-white/5 text-[9px] text-slate-500">
                      <span>Applied: {new Date(app.createdAt).toLocaleDateString()}</span>
                      <span>Score: {app.matchScore}%</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>        {/* Advanced Career Intelligence */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="glass-panel p-6 rounded-2xl border border-white/5">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-bold text-white">AI Career Copilot</h3>
            </div>
            <p className="text-slate-400 text-xs mb-4">Ask for role-specific guidance based on your current profile, ATS score, and readiness signals.</p>
            <form onSubmit={handleAskCopilot} className="space-y-3">
              <textarea
                value={copilotQuestion}
                onChange={(e) => setCopilotQuestion(e.target.value)}
                placeholder="Example: what should I improve to land a frontend role?"
                className="w-full min-h-[86px] rounded-xl bg-black/20 border border-white/10 text-slate-100 text-sm px-3 py-3 focus:outline-none focus:border-indigo-500/60"
              />
              <div className="flex items-center justify-between gap-3">
                <button type="submit" disabled={advancedLoading} className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold disabled:opacity-60">
                  {advancedLoading ? 'Thinkingâ€¦' : 'Ask Copilot'}
                </button>
                <span className="text-[10px] text-slate-400">Readiness: {readinessData?.score ?? profile?.industryReadinessScore ?? 0}%</span>
              </div>
            </form>
            {copilotAnswer && (
              <div className="mt-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs text-emerald-100">{copilotAnswer}</div>
            )}
            {copilotHistory.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500">Recent prompts</p>
                {copilotHistory.slice(0, 3).map((entry) => (
                  <div key={entry.id} className="rounded-xl bg-white/5 border border-white/5 p-3 text-xs text-slate-300">
                    <div className="font-semibold text-white">{entry.question}</div>
                    <p className="text-slate-400 mt-1">{entry.answer}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-white/5">
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white">Career Readiness Radar</h3>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs mb-4">
              <div className="rounded-xl bg-white/5 border border-white/5 p-3">
                <div className="text-slate-400">Readiness Score</div>
                <div className="text-xl font-bold text-white">{readinessData?.score ?? 0}</div>
              </div>
              <div className="rounded-xl bg-white/5 border border-white/5 p-3">
                <div className="text-slate-400">Label</div>
                <div className="text-sm font-bold text-emerald-100">{readinessData?.label ?? 'On Track'}</div>
              </div>
            </div>
            <div className="rounded-xl bg-black/20 border border-white/10 p-4 text-xs text-slate-300 space-y-2">
              {readinessData?.metrics
                ? Object.entries(readinessData.metrics).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between gap-2">
                  <span>{key.replace(/([A-Z])/g, ' $1').replace(/^./, (char) => char.toUpperCase())}</span>
                  <span className="text-emerald-300 font-semibold">
                    {typeof value === 'number' ? `${value}` : String(value)}
                  </span>
                </div>
                ))
                : <p className="text-slate-400">Run the readiness analysis to populate your dynamic scoring summary.</p>}
            </div>
            <div className="mt-3 rounded-xl bg-white/5 border border-white/5 p-3 text-slate-300 text-[11px]">
              <div className="flex items-center gap-2 text-slate-200 mb-1"><ShieldCheck className="w-3.5 h-3.5" /> Next actions</div>
              {(readinessData?.suggestions || []).length ? readinessData.suggestions.map((item) => <p key={item} className="mb-1">â€¢ {item}</p>) : <p>No suggestions available yet. Upload a resume or refresh the data to generate them.</p>}
            </div>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-white/5">
            <div className="flex items-center gap-2 mb-3">
              <GitBranch className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white">GitHub Analytics</h3>
            </div>
            <div className="space-y-4 text-xs">
              <input value={githubUsername} onChange={(e) => setGithubUsername(e.target.value)} className="w-full rounded-xl bg-black/20 border border-white/10 text-slate-100 px-3 py-2 focus:outline-none focus:border-indigo-500/60" placeholder="Enter GitHub username or profile URL" />
              <button onClick={handleConnectGithub} disabled={advancedLoading} className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold disabled:opacity-60">Analyze GitHub Profile</button>
              {githubProfile ? (
                <>
                  <div className="rounded-xl bg-white/5 border border-white/5 p-3 text-slate-300 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-white font-semibold text-sm">{githubProfile.username || githubUsername}</div>
                        <p className="text-slate-400 mt-1 text-[11px]">{githubProfile.contributionSummary || 'Real profile data loaded from GitHub.'}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] uppercase tracking-[0.25em] text-slate-500">GitHub Score</div>
                        <div className="text-lg font-bold text-emerald-300">{githubProfile.strengthScore ?? githubProfile.contributionScore ?? 0}</div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 text-[11px] text-slate-300">
                      <span className="px-2 py-1 rounded bg-indigo-500/10 border border-indigo-500/20">{githubProfile.repositoryCount || githubProfile.repos?.length || 0} repos</span>
                      <span className="px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/20">{githubProfile.totalStars || 0} stars</span>
                      <span className="px-2 py-1 rounded bg-amber-500/10 border border-amber-500/20">{githubProfile.followers || 0} followers</span>
                    </div>
                    <p className="text-slate-400">Top technologies: {(githubProfile.topLanguages || []).join(', ') || 'No language data yet.'}</p>
                    <p className="text-slate-400">Highlights: {(githubProfile.highlights || []).join(' | ') || 'Connect your GitHub account to see project signals and skill strengths.'}</p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    <div className="rounded-xl bg-black/20 border border-white/10 p-3">
                      <div className="text-slate-200 text-[11px] font-semibold mb-3">Language Breakdown</div>
                      {githubLanguageChart.length > 0 ? (
                        <div className="h-52">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie data={githubLanguageChart} dataKey="count" nameKey="name" innerRadius={40} outerRadius={70} paddingAngle={2}>
                                {githubLanguageChart.map((entry, index) => (
                                  <Cell key={entry.name} fill={['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#38bdf8', '#8b5cf6'][index % 6]} />
                                ))}
                              </Pie>
                              <Tooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <p className="text-slate-400">No public language data is available for this profile.</p>
                      )}
                    </div>

                    <div className="rounded-xl bg-black/20 border border-white/10 p-3">
                      <div className="text-slate-200 text-[11px] font-semibold mb-3">Top Repositories</div>
                      {githubRepoChart.length > 0 ? (
                        <div className="h-52">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={githubRepoChart} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                              <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={50} />
                              <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
                              <Tooltip />
                              <Bar dataKey="stars" fill="#10b981" radius={[6, 6, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <p className="text-slate-400">No public repositories found for this profile.</p>
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl bg-white/5 border border-white/5 p-3 text-slate-300">
                    <div className="text-slate-200 text-[11px] font-semibold mb-2">Repository Insights</div>
                    <div className="space-y-2">
                      {(githubProfile.repos || []).slice(0, 4).map((repo) => (
                        <div key={repo.id || repo.name} className="flex items-center justify-between gap-3 rounded-lg bg-black/20 border border-white/5 px-3 py-2">
                          <div>
                            <div className="text-white text-[11px] font-semibold">{repo.name}</div>
                            <div className="text-slate-400 text-[10px]">{repo.language || 'Unknown'} | Updated {repo.updated_at ? new Date(repo.updated_at).toLocaleDateString() : 'N/A'}</div>
                          </div>
                          <div className="text-right text-[10px] text-slate-300">
                            <div>{repo.stargazers_count || 0} stars</div>
                            <div>{repo.forks_count || 0} forks</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-slate-400 text-[11px]">Connect a GitHub profile to analyze your public project activity, languages, and contribution signals.</p>
              )}
            </div>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-white/5">
            <div className="flex items-center gap-2 mb-3">
              <Brain className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white">AI Resume Tailoring</h3>
            </div>
            <form onSubmit={handleTailorResume} className="space-y-3 text-xs">
              <input value={tailorRole} onChange={(e) => setTailorRole(e.target.value)} placeholder="Target role, e.g. Frontend Developer" className="w-full rounded-xl bg-black/20 border border-white/10 text-slate-100 px-3 py-2 focus:outline-none focus:border-indigo-500/60" />
              <textarea value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} placeholder="Paste the job description you want to tailor for" className="w-full min-h-[88px] rounded-xl bg-black/20 border border-white/10 text-slate-100 px-3 py-2 focus:outline-none focus:border-indigo-500/60" />
              <div className="flex items-center gap-2">
                <button type="submit" disabled={tailoringLoading} className="px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-400/20 text-amber-100 text-[11px] font-semibold hover:bg-amber-500/20 disabled:opacity-60">{tailoringLoading ? 'Tailoringâ€¦' : 'Generate Tailored Resume'}</button>
                {tailorResult?.version && <button type="button" onClick={handleRollbackVersion} className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-200 text-[11px] font-semibold hover:bg-white/10">Rollback</button>}
              </div>
            </form>
            {tailorResult && (
              <div className="mt-4 rounded-xl bg-white/5 border border-white/5 p-3 text-slate-300 text-[11px] space-y-2">
                <div className="font-semibold text-white">Version {tailorResult.version?.version || 1}</div>
                <p>{tailorResult.optimizedSummary || 'Resume tailoring completed with ATS-focused improvements.'}</p>
                <div className="text-slate-400">
                  {(tailorResult.matchingSkills || []).length
                    ? `Matching skills: ${tailorResult.matchingSkills.join(', ')}`
                    : 'Resume tailored to the target role.'}
                </div>
                {(tailorResult.missingSkills || []).length > 0 && (
                  <div className="text-slate-400">
                    Missing skills: {tailorResult.missingSkills.join(', ')}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-white/5">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-4 h-4 text-pink-400" />
              <h3 className="text-sm font-bold text-white">Skill Assessments</h3>
            </div>
            <form onSubmit={handleGenerateAssessment} className="space-y-3 text-xs">
              <input value={assessmentPromptSkill} onChange={(e) => setAssessmentPromptSkill(e.target.value)} placeholder="Skill to assess (e.g. React, SQL, DSA)" className="w-full rounded-xl bg-black/20 border border-white/10 text-slate-100 px-3 py-2 focus:outline-none focus:border-indigo-500/60" />
              <button type="submit" disabled={advancedLoading} className="px-3 py-2 rounded-xl bg-pink-500/10 border border-pink-400/20 text-pink-100 text-[11px] font-semibold hover:bg-pink-500/20 disabled:opacity-60">Generate Questions</button>
            </form>
            {assessmentQuestions.length > 0 && (
              <form onSubmit={handleSubmitAssessment} className="mt-4 space-y-3">
                {assessmentQuestions.map((question) => (
                  <div key={question.id || question.prompt} className="rounded-xl bg-black/20 border border-white/10 p-3 text-[11px] text-slate-300">
                    <label className="block text-slate-200 mb-1">{question.prompt}</label>
                    <textarea value={assessmentAnswers[question.id || question.prompt] || ''} onChange={(e) => setAssessmentAnswers((prev) => ({ ...prev, [question.id || question.prompt]: e.target.value }))} className="w-full min-h-[56px] rounded-xl bg-white/5 border border-white/10 text-slate-100 px-3 py-2 focus:outline-none focus:border-indigo-500/60" placeholder="Type your answer" />
                  </div>
                ))}
                <button type="submit" disabled={advancedLoading} className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold disabled:opacity-60">Submit Assessment</button>
              </form>
            )}
            {assessmentResult && (
              <div className="mt-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs text-emerald-100 space-y-1">
                <div>{`Assessment scored ${assessmentResult.score ?? 0}/100.`}</div>
                {(assessmentResult.strengths || []).length > 0 && (
                  <div className="text-emerald-200">
                    Strengths: {assessmentResult.strengths.join(', ')}
                  </div>
                )}
              </div>
            )}
            {assessments.length > 0 && (
              <div className="mt-4 space-y-2 max-h-[180px] overflow-y-auto">
                {assessments.slice(0, 5).map((item) => (
                  <div key={item.id} className="rounded-xl bg-white/5 border border-white/5 p-3 text-xs text-slate-300">
                    <div className="flex items-center justify-between"><strong className="text-white">{item.skill || 'Assessment'}</strong><span className="text-emerald-300">{item.score ?? 'â€”'}/100</span></div>
                    <p className="text-slate-400 mt-1">{item.strengths?.join(' â€¢ ') || 'Assessment saved and ready for review.'}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg glass-panel rounded-2xl border border-white/10 shadow-2xl p-6 text-left">
            <div className="flex justify-between items-center border-b border-white/5 pb-4 mb-4">
              <h3 className="text-base font-bold text-white">Edit Profile Details</h3>
              <button 
                onClick={() => setShowEditModal(false)}
                className="p-1 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-slate-300 text-xs font-semibold mb-1.5">SKILLS (Comma Separated)</label>
                <textarea
                  value={skillsText}
                  onChange={(e) => setSkillsText(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl text-sm glass-input text-white focus:outline-none min-h-[80px]"
                  placeholder="javascript, react, node.js, sql, git"
                />
              </div>

              <div>
                <label className="block text-slate-300 text-xs font-semibold mb-1.5">CERTIFICATIONS</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCert}
                    onChange={(e) => setNewCert(e.target.value)}
                    className="flex-1 px-4 py-2 rounded-xl text-sm glass-input text-white focus:outline-none"
                    placeholder="e.g. Google UX Design Certificate"
                  />
                  <button
                    type="button"
                    onClick={addCert}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Add
                  </button>
                </div>
                
                <div className="mt-3 space-y-1.5 max-h-[100px] overflow-y-auto">
                  {certsList.map((cert, idx) => (
                    <div key={idx} className="flex justify-between items-center px-3 py-1 rounded bg-white/5 text-xs text-slate-300 border border-white/5">
                      <span className="truncate max-w-[320px]">{cert}</span>
                      <button 
                        type="button" 
                        onClick={() => removeCert(idx)}
                        className="text-red-400 hover:text-red-300 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-white/5 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/10 cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

