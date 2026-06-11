import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { ArrowLeft, MapPin, DollarSign, BrainCircuit, CheckCircle, AlertTriangle, Lightbulb, Loader2 } from 'lucide-react';
import { apiCall } from '../utils/api';

export default function JobDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useSelector(state => state.auth);

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchJobDetails = async () => {
      try {
        setLoading(true);
        const data = await apiCall(`/jobs/${id}`);
        setJob(data);

        // Check if student has already applied
        if (isAuthenticated && user.role === 'student') {
          const apps = await apiCall('/applications/student');
          const alreadyApplied = apps.some(app => app.jobId === id);
          setHasApplied(alreadyApplied);
        }
      } catch (err) {
        console.error(err);
        setError('Failed to fetch job details.');
      } finally {
        setLoading(false);
      }
    };
    fetchJobDetails();
  }, [id, isAuthenticated, user]);

  const handleApply = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    setApplying(true);
    setError(null);
    try {
      await apiCall('/applications', 'POST', { jobId: id });
      setHasApplied(true);
      alert('Application submitted successfully!');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error submitting application.');
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-80px)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="max-w-xl mx-auto px-6 py-16 text-center text-left">
        <h2 className="text-xl font-bold text-white mb-2">Job Not Found</h2>
        <Link to="/jobs" className="text-indigo-400 hover:underline text-sm">Back to Job Board</Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 text-left">
      {/* Back button */}
      <Link to="/jobs" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white mb-6">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Job Board
      </Link>

      {/* Error alert */}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4.5 h-4.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Hero Header */}
      <div className="glass-panel p-6 rounded-2xl border border-white/5 mb-8 relative">
        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
          <div>
            <div className="inline-block px-2.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] font-bold uppercase mb-3">
              {job.type}
            </div>
            <h2 className="text-2xl font-bold text-white mb-1">{job.title}</h2>
            <h3 className="text-slate-300 font-semibold text-sm mb-4">{job.company}</h3>

            <div className="flex flex-wrap items-center gap-6 text-slate-400 text-xs">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-slate-500" /> {job.location}
              </span>
              <span className="flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-slate-500" /> {job.salary}
              </span>
            </div>
          </div>

          <div className="w-full md:w-auto mt-4 md:mt-0 shrink-0">
            {(!isAuthenticated || user.role === 'student') && (
              <button
                onClick={handleApply}
                disabled={hasApplied || applying}
                className={`w-full md:w-auto px-6 py-2.5 rounded-xl text-xs font-semibold shadow-lg transition-all text-center cursor-pointer ${
                  hasApplied
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/15'
                }`}
              >
                {applying ? (
                  <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                ) : hasApplied ? (
                  'Applied'
                ) : (
                  'Apply Now'
                )}
              </button>
            )}

            {isAuthenticated && user.role !== 'student' && (
              <span className="text-slate-500 text-xs font-medium italic">
                Logged in as {user.role}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left column: Job details */}
        <div className="md:col-span-2 space-y-6">
          {/* Description */}
          <div className="glass-panel p-6 rounded-2xl border border-white/5">
            <h3 className="text-sm font-bold text-white mb-4">Job Description</h3>
            <p className="text-slate-300 text-xs leading-relaxed whitespace-pre-wrap">
              {job.description}
            </p>
          </div>

          {/* Requirements List */}
          <div className="glass-panel p-6 rounded-2xl border border-white/5">
            <h3 className="text-sm font-bold text-white mb-4 font-sans">Role Requirements</h3>
            <ul className="list-disc pl-4 text-slate-300 text-xs space-y-2">
              {(job.requirements || []).map((req, idx) => (
                <li key={idx} className="capitalize">{req}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right column: AI Compatibility details */}
        <div>
          {isAuthenticated && user.role === 'student' && (
            <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-6">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-white/5 pb-3">
                <BrainCircuit className="w-4.5 h-4.5 text-indigo-400" /> AI Score Card
              </h3>

              {/* Match score progress */}
              <div className="flex flex-col items-center">
                <div className="relative w-24 h-24 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="48" cy="48" r="40" stroke="rgba(255,255,255,0.05)" strokeWidth="8" fill="transparent" />
                    <circle cx="48" cy="48" r="40" stroke="rgb(99, 102, 241)" strokeWidth="8" fill="transparent" 
                      strokeDasharray={251.2}
                      strokeDashoffset={251.2 - (251.2 * (job.matchScore || 0)) / 100}
                    />
                  </svg>
                  <span className="absolute text-xl font-bold text-white">{job.matchScore || 0}%</span>
                </div>
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mt-3">Compatibility</span>
              </div>

              {/* Gaps / Missing skills */}
              <div className="text-xs">
                <span className="font-bold text-red-400 block mb-2 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Missing Skills
                </span>
                {(job.missingSkills || []).length === 0 ? (
                  <p className="text-emerald-400 font-medium flex items-center gap-1 text-[11px]">
                    <CheckCircle className="w-3.5 h-3.5" /> Perfect skill alignment!
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {(job.missingSkills || []).map((skill, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] uppercase font-semibold">
                        {skill}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Suggestions */}
              <div className="text-xs pt-4 border-t border-white/5">
                <span className="font-bold text-amber-400 block mb-2 flex items-center gap-1">
                  <Lightbulb className="w-3.5 h-3.5" /> Tips for Candidate
                </span>
                <ul className="space-y-1.5 text-slate-300 pl-1">
                  {(job.matchSuggestions || []).map((sug, idx) => (
                    <li key={idx} className="list-none leading-relaxed flex items-start gap-1">
                      <span className="text-indigo-400 shrink-0 mt-1">&bull;</span>
                      <span>{sug}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {!isAuthenticated && (
            <div className="glass-panel p-6 rounded-2xl border border-white/5 text-center">
              <BrainCircuit className="w-10 h-10 text-indigo-400 mx-auto mb-3" />
              <h4 className="text-white font-bold text-xs mb-1">Check Matching Score</h4>
              <p className="text-slate-400 text-[11px] leading-relaxed mb-4">
                Sign in as a student to see compatibility breakdowns and missing skills.
              </p>
              <Link to="/login" className="block w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 rounded-xl text-xs transition-colors">
                Sign In
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
