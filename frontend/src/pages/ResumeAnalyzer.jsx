import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileText, AlertTriangle, CheckCircle, ArrowLeft, Lightbulb, BrainCircuit, ListCollapse } from 'lucide-react';
import { apiCall } from '../utils/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function ResumeAnalyzer() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await apiCall('/profiles/student');
        setProfile(data);
      } catch (err) {
        console.error('Error loading resume analysis:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-80px)] flex items-center justify-center">
        <span className="text-sm text-slate-400">Loading analysis reports...</span>
      </div>
    );
  }

  if (!profile || !profile.resumeUrl) {
    return (
      <div className="max-w-xl mx-auto px-6 py-16 text-center text-left">
        <div className="p-4 rounded-full bg-slate-900 text-slate-500 w-16 h-16 flex items-center justify-center mx-auto mb-6">
          <FileText className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">No Resume Uploaded</h2>
        <p className="text-slate-400 text-sm mb-6">
          Please upload your resume first on the Student Dashboard to view AI feedback.
        </p>
        <Link to="/dashboard/student" className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/15">
          <ArrowLeft className="w-4 h-4" /> Go to Dashboard
        </Link>
      </div>
    );
  }

  // Chart data
  const chartData = [
    { name: 'ATS Score', value: profile.atsScore, color: '#6366f1' },
    { name: 'Readiness', value: profile.industryReadinessScore, color: '#a855f7' },
    { name: 'Skills Match', value: Math.min(100, Math.round(profile.skills.length * 12)), color: '#3b82f6' }
  ];

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 text-left">
      {/* Back button */}
      <Link to="/dashboard/student" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white mb-6">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
      </Link>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-white/5 pb-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">AI Resume Audit Report</h2>
          <p className="text-slate-400 text-xs mt-1">
            Detailed feedback generated from {profile?.resumeFile?.fileName || profile.resumeUrl.split('/').pop()}
          </p>
        </div>
        
        <span className="mt-2 md:mt-0 px-3 py-1 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-bold uppercase tracking-wider">
          ATS V1 Auditor Active
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Columns (Content & Recommendations) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Missing Skills Alert */}
          <div className="glass-panel p-6 rounded-2xl border border-white/5">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <BrainCircuit className="w-4.5 h-4.5 text-indigo-400" /> Key Skills & Gaps
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">Identified Skills</h4>
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {(profile.skills || []).map((skill, idx) => (
                    <span key={idx} className="px-2.5 py-1 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-[10px] font-semibold uppercase">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-[11px] uppercase font-bold text-red-400/80 tracking-wider flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Core Missing Skills
                </h4>
                {(profile.missingSkills || []).length === 0 ? (
                  <p className="text-emerald-400 text-xs mt-2.5 flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" /> Profile covers all basic developer track requirements.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    {(profile.missingSkills || []).map((skill, idx) => (
                      <span key={idx} className="px-2.5 py-1 rounded bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] font-semibold uppercase">
                        {skill}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* AI Suggestions List */}
          <div className="glass-panel p-6 rounded-2xl border border-white/5">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <Lightbulb className="w-4.5 h-4.5 text-amber-400" /> Actionable Improvements
            </h3>

            {(profile.suggestions || []).length === 0 ? (
              <p className="text-xs text-slate-400">Your resume is perfectly optimized!</p>
            ) : (
              <div className="space-y-3">
                {(profile.suggestions || []).map((suggestion, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-white/5 border border-white/5 flex gap-3 text-xs text-slate-300 leading-relaxed">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-600/20 text-indigo-400 font-bold text-[10px] shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span>{suggestion}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Extracted Sections Summary */}
          <div className="glass-panel p-6 rounded-2xl border border-white/5">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <ListCollapse className="w-4.5 h-4.5 text-indigo-400" /> Extracted Sections
            </h3>

            <div className="space-y-4 text-xs">
              <div>
                <span className="font-semibold text-slate-400 block mb-1">Education</span>
                {(profile.education || []).map((edu, idx) => (
                  <div key={idx} className="text-slate-300 border-l border-white/10 pl-3 py-1">
                    {edu.institution}
                  </div>
                ))}
              </div>

              <div>
                <span className="font-semibold text-slate-400 block mb-1">Work History</span>
                {(profile.experience || []).map((exp, idx) => (
                  <div key={idx} className="text-slate-300 border-l border-white/10 pl-3 py-1">
                    {exp.description}
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Visual Charts & Quick Scores */}
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-2xl border border-white/5">
            <h3 className="text-sm font-bold text-white mb-6">Profile Health Analytics</h3>
            
            {/* Recharts Bar Chart */}
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis domain={[0, 100]} stroke="#64748b" fontSize={10} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                    labelStyle={{ color: '#fff', fontSize: '11px', fontWeight: 'bold' }}
                    itemStyle={{ fontSize: '11px' }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-6 space-y-4 pt-4 border-t border-white/5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">ATS Formatting Score</span>
                <span className="font-bold text-white">{profile.atsScore}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Industry Readiness</span>
                <span className="font-bold text-white">{profile.industryReadinessScore}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Target Track Alignment</span>
                <span className="font-bold text-indigo-400">Backend / Full Stack Dev</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
