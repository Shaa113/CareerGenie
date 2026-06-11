import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Briefcase, MapPin, Search, DollarSign, Filter, Loader2, ArrowRight } from 'lucide-react';
import { apiCall } from '../utils/api';
import { JOBS_UPDATED_EVENT_NAME } from '../utils/jobSync';

export default function JobBoard() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('All');
  
  const { isAuthenticated, user } = useSelector(state => state.auth);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        setLoading(true);
        const data = await apiCall('/jobs');
        setJobs(data);
      } catch (err) {
        console.error('Error fetching jobs:', err);
      } finally {
        setLoading(false);
      }
    };

    const refreshJobs = () => {
      void fetchJobs();
    };

    refreshJobs();

    const handleJobsUpdated = () => refreshJobs();
    const handleStorage = (event) => {
      if (event.key === 'careergenie:jobs-updated') {
        refreshJobs();
      }
    };

    window.addEventListener(JOBS_UPDATED_EVENT_NAME, handleJobsUpdated);
    window.addEventListener('storage', handleStorage);

    const refreshInterval = window.setInterval(refreshJobs, 15000);

    return () => {
      window.removeEventListener(JOBS_UPDATED_EVENT_NAME, handleJobsUpdated);
      window.removeEventListener('storage', handleStorage);
      window.clearInterval(refreshInterval);
    };
  }, []);

  // Filter jobs based on search query and type
  const filteredJobs = jobs.filter(job => {
    const requirements = job.requirements || [];
    const matchesSearch = job.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          job.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          requirements.some(req => req.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesType = filterType === 'All' || job.type === filterType;
    
    return matchesSearch && matchesType;
  });

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-80px)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 text-left">
      {/* Page Header */}
      <div className="border-b border-white/5 pb-4 mb-6">
        <h2 className="text-2xl font-bold text-white">Find Your Fit</h2>
        <p className="text-slate-400 text-xs mt-1">Explore job opportunities curated with AI matching scores</p>
      </div>

      {/* Filters Area */}
      <div className="flex flex-col md:flex-row items-center gap-4 mb-8">
        <div className="relative flex-1 w-full">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm glass-input text-white focus:outline-none"
            placeholder="Search by role, company, or skills (e.g. React)..."
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative w-full md:w-48">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
              <Filter className="w-4 h-4" />
            </span>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm glass-input text-white focus:outline-none appearance-none"
            >
              <option value="All" className="bg-slate-900">All Types</option>
              <option value="Full-time" className="bg-slate-900">Full-time</option>
              <option value="Internship" className="bg-slate-900">Internship</option>
              <option value="Part-time" className="bg-slate-900">Part-time</option>
              <option value="Contract" className="bg-slate-900">Contract</option>
            </select>
          </div>
        </div>
      </div>

      {/* Jobs Grid */}
      {filteredJobs.length === 0 ? (
        <div className="glass-panel p-12 text-center rounded-2xl border border-white/5">
          <Briefcase className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-white font-bold mb-1">No Jobs Found</h3>
          <p className="text-slate-500 text-xs">Try adjusting your filters or search terms.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredJobs.map((job) => (
            <div 
              key={job.id} 
              className="glass-panel p-6 rounded-2xl border border-white/5 hover:border-indigo-500/20 transition-all flex flex-col justify-between group relative"
            >
              {/* Score Indicator if logged in as student */}
              {isAuthenticated && user.role === 'student' && job.matchScore !== null && (
                <span className={`absolute top-6 right-6 px-2.5 py-0.5 rounded-lg text-xs font-extrabold border ${
                  job.matchScore >= 80 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                  job.matchScore >= 50 ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                  'bg-red-500/10 text-red-400 border-red-500/20'
                }`}>
                  {job.matchScore}% Compatibility
                </span>
              )}

              <div>
                <div className="inline-block px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] font-bold uppercase tracking-wider mb-3">
                  {job.type}
                </div>
                
                <h3 className="text-lg font-bold text-white group-hover:text-indigo-400 transition-colors mb-1">
                  {job.title}
                </h3>
                <p className="text-slate-400 text-sm font-semibold mb-4">{job.company}</p>

                <div className="flex flex-wrap items-center gap-4 text-slate-400 text-xs mb-4">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-500" /> {job.location}
                  </span>
                  <span className="flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5 text-slate-500" /> {job.salary}
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-6">
                  {(job.requirements || []).slice(0, 4).map((req, idx) => (
                    <span key={idx} className="px-2 py-0.5 rounded bg-white/5 border border-white/5 text-[10px] text-slate-400 uppercase font-semibold">
                      {req}
                    </span>
                  ))}
                  {(job.requirements || []).length > 4 && (
                    <span className="text-[10px] text-slate-500 mt-0.5">+{(job.requirements || []).length - 4} more</span>
                  )}
                </div>
              </div>

              <div className="border-t border-white/5 pt-4 flex justify-between items-center mt-auto">
                <span className="text-[10px] text-slate-500">Posted {new Date(job.createdAt).toLocaleDateString()}</span>
                
                <Link
                  to={`/jobs/${job.id}`}
                  className="flex items-center gap-1 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white px-4 py-1.5 rounded-lg text-xs font-semibold border border-indigo-500/20 hover:border-transparent transition-all cursor-pointer"
                >
                  View Details <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
