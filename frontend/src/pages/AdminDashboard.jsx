import { useState, useEffect } from 'react';
import { Shield, Users, Briefcase, FileText, Check, X, Trash2, Award, Loader2, RefreshCw } from 'lucide-react';
import { apiCall } from '../utils/api';

export default function AdminDashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [users, setUsers] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('moderation'); // moderation, users, complaints

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const [analyticData, usersList, jobsList, complaintsList] = await Promise.all([
        apiCall('/admin/analytics'),
        apiCall('/admin/users'),
        apiCall('/admin/jobs'),
        apiCall('/admin/complaints')
      ]);

      setAnalytics(analyticData);
      setUsers(usersList);
      setJobs(jobsList);
      setComplaints(complaintsList);
      
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch administrator console data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchAdminData();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const handleApproveJob = async (jobId, approve) => {
    const status = approve ? 'Approved' : 'Rejected';
    try {
      await apiCall(`/admin/jobs/${jobId}/approve`, 'PUT', { status });
      // Update local state
      setJobs(prev => prev.map(job => job.id === jobId ? { ...job, status } : job));
      
      // Update analytics
      const analyticData = await apiCall('/admin/analytics');
      setAnalytics(analyticData);
      
      alert(`Job has been ${status.toLowerCase()} and recruiter notified.`);
    } catch (err) {
      console.error(err);
      alert('Failed to update job status.');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user? This will remove all their profiles, jobs, and applications!')) return;

    try {
      await apiCall(`/admin/users/${userId}`, 'DELETE');
      setUsers(prev => prev.filter(u => u.id !== userId));
      
      // Update analytics
      const analyticData = await apiCall('/admin/analytics');
      setAnalytics(analyticData);
      
      alert('User and associated data removed successfully.');
    } catch (err) {
      console.error(err);
      alert(err.message || 'Failed to delete user.');
    }
  };

  const handleResolveComplaint = async (complaintId, newStatus) => {
    try {
      await apiCall(`/admin/complaints/${complaintId}`, 'PUT', { status: newStatus });
      setComplaints(prev => prev.map(c => c.id === complaintId ? { ...c, status: newStatus } : c));
      alert('Ticket status updated and user notified.');
    } catch (err) {
      console.error(err);
      alert('Failed to update complaint status.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-80px)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  const pendingJobs = jobs.filter(j => j.status === 'Pending');

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 text-left space-y-8">
      {/* Admin Header */}
      <div className="flex justify-between items-center border-b border-white/5 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Shield className="w-6 h-6 text-indigo-400" /> Admin Console
          </h2>
          <p className="text-slate-400 text-xs mt-1">Platform overview, job moderation, user management, and complaints</p>
        </div>
        
        <button 
          onClick={fetchAdminData}
          className="p-2 rounded bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
          <span>{error}</span>
        </div>
      )}

      {/* Analytics Grid */}
      {analytics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="glass-panel p-5 rounded-2xl border border-white/5 flex items-center gap-4">
            <div className="p-3 bg-indigo-600/10 text-indigo-400 rounded-xl">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Total Users</span>
              <h3 className="text-xl font-bold text-white mt-0.5">{analytics.users.total}</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">{analytics.users.students} Stu &bull; {analytics.users.recruiters} Rec</p>
            </div>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-white/5 flex items-center gap-4">
            <div className="p-3 bg-purple-600/10 text-purple-400 rounded-xl">
              <Briefcase className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Moderated Jobs</span>
              <h3 className="text-xl font-bold text-white mt-0.5">{analytics.jobs.approved}</h3>
              <p className="text-[10px] text-yellow-400 mt-0.5">{analytics.jobs.pending} Pending Review</p>
            </div>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-white/5 flex items-center gap-4">
            <div className="p-3 bg-pink-600/10 text-pink-400 rounded-xl">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Applications</span>
              <h3 className="text-xl font-bold text-white mt-0.5">{analytics.applications.total}</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Submitted matches</p>
            </div>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-white/5 flex items-center gap-4">
            <div className="p-3 bg-emerald-600/10 text-emerald-400 rounded-xl">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Avg ATS Score</span>
              <h3 className="text-xl font-bold text-white mt-0.5">{analytics.avgAtsScore}%</h3>
              <p className="text-[10px] text-emerald-400 mt-0.5">Profile readiness average</p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-4 border-b border-white/5">
        <button
          onClick={() => setActiveTab('moderation')}
          className={`pb-3 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === 'moderation' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-slate-400 hover:text-white'
          }`}
        >
          Job Moderation ({pendingJobs.length})
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`pb-3 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === 'users' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-slate-400 hover:text-white'
          }`}
        >
          User Manager ({users.length})
        </button>
        <button
          onClick={() => setActiveTab('complaints')}
          className={`pb-3 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === 'complaints' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-slate-400 hover:text-white'
          }`}
        >
          Complaints Inbox ({complaints.filter(c => c.status !== 'Resolved').length})
        </button>
      </div>

      {/* Tab Panels */}
      <div className="mt-4">
        
        {/* Moderation Tab */}
        {activeTab === 'moderation' && (
          <div className="glass-panel p-6 rounded-2xl border border-white/5">
            <h3 className="text-sm font-bold text-white mb-4">Pending Postings Moderation</h3>
            {pendingJobs.length === 0 ? (
              <div className="text-center py-10 text-xs text-slate-500">
                No job postings currently pending moderation review.
              </div>
            ) : (
              <div className="space-y-4">
                {pendingJobs.map((job) => (
                  <div key={job.id} className="p-4 rounded-xl bg-white/5 border border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[9px] font-bold uppercase">
                        {job.type}
                      </span>
                      <h4 className="text-sm font-bold text-white mt-1.5">{job.title}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">{job.company} &bull; {job.location}</p>
                      <p className="text-[11px] text-slate-400 mt-2 line-clamp-2">{job.description}</p>
                      <div className="text-[10px] text-slate-500 mt-2">
                        Requirements: {(job.requirements || []).join(', ')}
                      </div>
                      <span className="text-[9px] text-indigo-400 mt-2 block">Poster: {job.recruiter?.name} ({job.recruiter?.email})</span>
                    </div>

                    <div className="flex gap-2 shrink-0 w-full md:w-auto">
                      <button
                        onClick={() => handleApproveJob(job.id, false)}
                        className="flex-1 md:flex-none flex items-center justify-center gap-1.5 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white px-3.5 py-2 rounded-xl text-xs font-semibold border border-red-500/20 transition-all cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" /> Reject
                      </button>
                      <button
                        onClick={() => handleApproveJob(job.id, true)}
                        className="flex-1 md:flex-none flex items-center justify-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-white px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" /> Approve
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="glass-panel p-6 rounded-2xl border border-white/5 overflow-hidden">
            <h3 className="text-sm font-bold text-white mb-4">Platform User Registry</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400">
                    <th className="pb-3 font-semibold">User</th>
                    <th className="pb-3 font-semibold">Email</th>
                    <th className="pb-3 font-semibold">Role</th>
                    <th className="pb-3 font-semibold">Registered</th>
                    <th className="pb-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-300">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-3.5 flex items-center gap-2">
                        <img src={user.avatar} className="w-7 h-7 rounded-full bg-slate-800" alt="" />
                        <span className="font-semibold text-white">{user.name}</span>
                      </td>
                      <td className="py-3.5">{user.email}</td>
                      <td className="py-3.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          user.role === 'admin' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                          user.role === 'recruiter' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                          'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="py-3.5 text-slate-500">{new Date(user.createdAt).toLocaleDateString()}</td>
                      <td className="py-3.5 text-right">
                        <button
                          disabled={user.role === 'admin'}
                          onClick={() => handleDeleteUser(user.id)}
                          className="p-1.5 rounded bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/20 hover:border-transparent transition-all disabled:opacity-30 disabled:hover:bg-red-500/10 disabled:hover:text-red-400 cursor-pointer"
                          title="Delete User"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Complaints Tab */}
        {activeTab === 'complaints' && (
          <div className="glass-panel p-6 rounded-2xl border border-white/5">
            <h3 className="text-sm font-bold text-white mb-4">Support & Complaint Reports</h3>
            {complaints.length === 0 ? (
              <div className="text-center py-10 text-xs text-slate-500">
                No tickets submitted yet.
              </div>
            ) : (
              <div className="space-y-4">
                {complaints.map((c) => (
                  <div key={c.id} className="p-4 rounded-xl bg-white/5 border border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${
                          c.status === 'Resolved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                          c.status === 'In Progress' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                          'bg-red-500/10 text-red-400 border-red-500/20'
                        }`}>
                          {c.status}
                        </span>
                        <span className="text-[10px] text-slate-500">Ticket ID: {c.id}</span>
                      </div>
                      <h4 className="text-sm font-bold text-white mt-2">{c.title}</h4>
                      <p className="text-xs text-slate-300 mt-1 leading-relaxed">{c.description}</p>
                      
                      <div className="text-[10px] text-indigo-400 mt-2.5">
                        Filed by: {c.user?.name} ({c.user?.email}) &bull; <span className="uppercase font-semibold">{c.user?.role}</span>
                      </div>
                    </div>

                    <div className="flex gap-2 shrink-0 w-full md:w-auto">
                      {c.status !== 'Resolved' && (
                        <>
                          <button
                            onClick={() => handleResolveComplaint(c.id, 'In Progress')}
                            className="flex-1 md:flex-none bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold border border-amber-500/20 transition-all cursor-pointer"
                          >
                            In Progress
                          </button>
                          <button
                            onClick={() => handleResolveComplaint(c.id, 'Resolved')}
                            className="flex-1 md:flex-none bg-emerald-500 hover:bg-emerald-400 text-white px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                          >
                            Resolve Ticket
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
