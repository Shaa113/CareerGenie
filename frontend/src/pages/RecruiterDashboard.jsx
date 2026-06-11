import { useState, useEffect } from 'react';
import { Briefcase, Plus, X, Users, MapPin, DollarSign, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { apiCall } from '../utils/api';
import { notifyJobsUpdated } from '../utils/jobSync';

export default function RecruiterDashboard() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPostModal, setShowPostModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [applicants, setApplicants] = useState([]);
  const [loadingApplicants, setLoadingApplicants] = useState(false);
  const [error, setError] = useState(null);

  // Form states
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [description, setDescription] = useState('');
  const [requirements, setRequirements] = useState('');
  const [location, setLocation] = useState('');
  const [type, setType] = useState('Full-time');
  const [salary, setSalary] = useState('');

  const fetchRecruiterJobs = async () => {
    try {
      setLoading(true);
      const data = await apiCall('/jobs/recruiter');
      setJobs(data);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Failed to load job listings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchRecruiterJobs();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const handlePostJob = async (e) => {
    e.preventDefault();
    if (!title || !company || !description || !requirements || !location) return;

    try {
      await apiCall('/jobs', 'POST', {
        title, company, description, requirements, location, type, salary
      });
      setShowPostModal(false);
      // Reset form
      setTitle(''); setCompany(''); setDescription(''); setRequirements(''); setLocation(''); setType('Full-time'); setSalary('');
      await fetchRecruiterJobs();
      notifyJobsUpdated();
      alert('Job posted successfully and is now live for students.');
    } catch (err) {
      console.error(err);
      setError('Failed to post job.');
    }
  };

  const handleViewApplicants = async (job) => {
    setSelectedJob(job);
    setLoadingApplicants(true);
    try {
      const data = await apiCall(`/applications/job/${job.id}`);
      setApplicants(data);
    } catch (err) {
      console.error(err);
      alert('Failed to load applicants.');
    } finally {
      setLoadingApplicants(false);
    }
  };

  const handleStatusChange = async (appId, newStatus) => {
    try {
      await apiCall(`/applications/${appId}/status`, 'PUT', { status: newStatus });
      setApplicants(prev => prev.map(app => app.id === appId ? { ...app, status: newStatus } : app));
      alert('Application status updated and notification dispatched.');
    } catch (err) {
      console.error(err);
      alert('Failed to update status.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-80px)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 text-left">
      {/* Error Banner */}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Recruiter Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-white/5 pb-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white">Recruiter Console</h2>
          <p className="text-slate-400 text-xs mt-1">Manage active listings and review applicants using AI candidate scoring</p>
        </div>
        
        <button
          onClick={() => setShowPostModal(true)}
          className="mt-4 sm:mt-0 flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/15 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Post New Job
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Columns: Job Listings */}
        <div className="lg:col-span-2 space-y-6">
          <h3 className="text-sm font-bold text-white mb-4">Your Job Postings</h3>
          {jobs.length === 0 ? (
            <div className="glass-panel p-12 text-center rounded-2xl border border-white/5">
              <Briefcase className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 text-xs">No jobs posted yet. Click "Post New Job" to begin.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {jobs.map((job) => (
                <div 
                  key={job.id} 
                  className={`glass-panel p-6 rounded-2xl border transition-all flex flex-col justify-between ${
                    selectedJob?.id === job.id ? 'border-indigo-500/50 shadow-indigo-500/10' : 'border-white/5 hover:border-indigo-500/20'
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[9px] font-bold uppercase">
                        {job.type}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${
                        job.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                        job.status === 'Rejected' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                        'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}>
                        {job.status}
                      </span>
                    </div>
                    
                    <h4 className="text-base font-bold text-white mb-1">{job.title}</h4>
                    <p className="text-slate-400 text-xs mb-3">{job.company}</p>

                    <div className="space-y-1.5 text-slate-400 text-[11px] mb-4">
                      <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-slate-500" /> {job.location}</div>
                      <div className="flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5 text-slate-500" /> {job.salary}</div>
                    </div>
                  </div>

                  <div className="border-t border-white/5 pt-4 flex justify-between items-center mt-4">
                    <span className="text-[10px] text-slate-500">Posted: {new Date(job.createdAt).toLocaleDateString()}</span>
                    
                    <button
                      onClick={() => handleViewApplicants(job)}
                      className="flex items-center gap-1 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white px-3 py-1.5 rounded-lg text-xs font-semibold border border-indigo-500/20 hover:border-transparent transition-all cursor-pointer"
                    >
                      <Users className="w-3.5 h-3.5" /> Applicants
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Applicants Panel */}
        <div className="glass-panel p-6 rounded-2xl border border-white/5">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center justify-between">
            <span>Applicants Pipeline</span>
            {selectedJob && (
              <button 
                onClick={() => handleViewApplicants(selectedJob)}
                className="p-1 rounded hover:bg-white/5 text-slate-400 hover:text-white cursor-pointer"
                title="Refresh Applicants"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            )}
          </h3>

          {!selectedJob ? (
            <div className="text-center py-16 text-slate-500 text-xs">
              Select a job listing to view candidates.
            </div>
          ) : loadingApplicants ? (
            <div className="text-center py-16">
              <Loader2 className="w-6 h-6 text-indigo-500 animate-spin mx-auto" />
            </div>
          ) : applicants.length === 0 ? (
            <div className="text-center py-16 text-slate-500 text-xs">
              No applications received for this job yet.
            </div>
          ) : (
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
              <div className="p-2 bg-indigo-500/10 rounded-lg text-[10px] text-indigo-300 border border-indigo-500/20 text-center mb-3">
                Candidates ranked by AI Match Score
              </div>

              {applicants.map((app) => (
                <div key={app.id} className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex gap-2.5 items-center">
                      <img 
                        src={app.student.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(app.student.name)}`} 
                        alt={app.student.name}
                        className="w-8 h-8 rounded-full border border-white/10"
                      />
                      <div>
                        <h4 className="text-xs font-bold text-white">{app.student.name}</h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">{app.student.email}</p>
                      </div>
                    </div>

                    <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold border ${
                      app.matchScore >= 80 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                      app.matchScore >= 50 ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                      'bg-red-500/10 text-red-400 border-red-500/20'
                    }`}>
                      {app.matchScore}% Match
                    </span>
                  </div>

                      <div className="text-[10px] text-slate-300 space-y-1 bg-white/5 p-2 rounded">
                    <div><span className="font-semibold text-slate-400">Candidate Skills:</span> {(app.profile.skills || []).join(', ') || 'None listed'}</div>
                    {(app.missingSkills || []).length > 0 && (
                      <div className="text-red-400"><span className="font-semibold text-slate-400">Missing Job Skills:</span> {(app.missingSkills || []).join(', ')}</div>
                    )}
                  </div>

                  {/* Status update selector */}
                  <div className="flex items-center justify-between border-t border-white/5 pt-3">
                    <span className="text-[10px] text-slate-500">Stage:</span>
                    <select
                      value={app.status}
                      onChange={(e) => handleStatusChange(app.id, e.target.value)}
                      className="px-2.5 py-1 rounded bg-slate-900 border border-white/10 text-[10px] text-white focus:outline-none"
                    >
                      <option value="Applied">Applied</option>
                      <option value="Reviewing">Reviewing</option>
                      <option value="Shortlisted">Shortlisted</option>
                      <option value="Rejected">Rejected</option>
                      <option value="Accepted">Accepted</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Post Job Modal */}
      {showPostModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg glass-panel rounded-2xl border border-white/10 shadow-2xl p-6 text-left">
            <div className="flex justify-between items-center border-b border-white/5 pb-4 mb-4">
              <h3 className="text-base font-bold text-white">Post New Job Opportunity</h3>
              <button 
                onClick={() => setShowPostModal(false)}
                className="p-1 rounded hover:bg-white/5 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePostJob} className="space-y-4 overflow-y-auto max-h-[450px] pr-1">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 text-xs font-semibold mb-1.5">JOB TITLE</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl text-sm glass-input text-white focus:outline-none"
                    placeholder="e.g. Node Developer"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 text-xs font-semibold mb-1.5">COMPANY NAME</label>
                  <input
                    type="text"
                    required
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl text-sm glass-input text-white focus:outline-none"
                    placeholder="e.g. Google"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 text-xs font-semibold mb-1.5">JOB DESCRIPTION</label>
                <textarea
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl text-sm glass-input text-white focus:outline-none min-h-[80px]"
                  placeholder="Explain the role, projects, and work environment..."
                />
              </div>

              <div>
                <label className="block text-slate-300 text-xs font-semibold mb-1.5">SKILL REQUIREMENTS (Comma Separated)</label>
                <input
                  type="text"
                  required
                  value={requirements}
                  onChange={(e) => setRequirements(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl text-sm glass-input text-white focus:outline-none"
                  placeholder="javascript, react, node.js, sql"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 text-xs font-semibold mb-1.5">LOCATION</label>
                  <input
                    type="text"
                    required
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl text-sm glass-input text-white focus:outline-none"
                    placeholder="e.g. London, UK or Remote"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 text-xs font-semibold mb-1.5">SALARY PACKAGE</label>
                  <input
                    type="text"
                    value={salary}
                    onChange={(e) => setSalary(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl text-sm glass-input text-white focus:outline-none"
                    placeholder="e.g. $80,000 - $100,000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 text-xs font-semibold mb-1.5">EMPLOYMENT TYPE</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl text-sm glass-input text-white focus:outline-none bg-slate-900"
                >
                  <option value="Full-time">Full-time</option>
                  <option value="Internship">Internship</option>
                  <option value="Part-time">Part-time</option>
                  <option value="Contract">Contract</option>
                </select>
              </div>

              <div className="pt-4 border-t border-white/5 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowPostModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/10 cursor-pointer"
                >
                  Submit Posting
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
