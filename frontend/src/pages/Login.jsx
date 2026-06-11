import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { authStart, authSuccess, authFailure, clearError } from '../store/authSlice';
import { Sparkles, Mail, Lock, Loader2, ArrowRight } from 'lucide-react';
import { apiCall } from '../utils/api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error } = useSelector((state) => state.auth);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return;

    dispatch(authStart());
    try {
      const data = await apiCall('/auth/login', 'POST', { email, password });
      dispatch(authSuccess(data));
      
      // Redirect based on role
      if (data.user.role === 'student') {
        navigate('/dashboard/student');
      } else if (data.user.role === 'recruiter') {
        navigate('/dashboard/recruiter');
      } else if (data.user.role === 'admin') {
        navigate('/dashboard/admin');
      }
    } catch (err) {
      dispatch(authFailure(err.message || 'Login failed'));
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-80px)] flex items-center justify-center px-6 overflow-hidden">
      {/* Glow effect */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-600/5 rounded-full glow-circle -z-10"></div>

      <div className="w-full max-w-md glass-panel p-8 rounded-2xl border border-white/5 shadow-2xl relative">
        <div className="flex flex-col items-center mb-6">
          <div className="p-2.5 rounded-xl bg-indigo-600/20 text-indigo-400 mb-3">
            <Sparkles className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-white">Welcome Back</h2>
          <p className="text-slate-400 text-xs mt-1">Access your CareerGenie portal</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-slate-300 text-xs font-semibold mb-1.5 uppercase tracking-wider">Email Address</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                <Mail className="w-4 h-4" />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) dispatch(clearError());
                }}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm glass-input text-white focus:outline-none"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 text-xs font-semibold mb-1.5 uppercase tracking-wider">Password</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) dispatch(clearError());
                }}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm glass-input text-white focus:outline-none"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white font-semibold py-2.5 rounded-xl transition-all shadow-lg shadow-indigo-600/10 cursor-pointer"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                Sign In <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-400">
          Don't have an account?{' '}
          <Link to="/register" className="text-indigo-400 hover:underline font-semibold">
            Create Account
          </Link>
        </div>

        {/* Guest Demo Logins Hint */}
        <div className="mt-6 pt-4 border-t border-white/5 text-left">
          <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-2">Demo Credentials:</p>
          <div className="grid grid-cols-1 gap-1.5 text-[10px] text-slate-400">
            <div><span className="font-semibold text-slate-300">Student:</span> student@mit.edu / student123</div>
            <div><span className="font-semibold text-slate-300">Recruiter:</span> recruiter@google.com / recruiter123</div>
            <div><span className="font-semibold text-slate-300">Admin:</span> admin@careergenie.com / admin123</div>
          </div>
        </div>
      </div>
    </div>
  );
}
