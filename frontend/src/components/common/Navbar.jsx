import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../../store/authSlice';
import { Sparkles, Bell, LogOut, Briefcase, FileText, LayoutDashboard, Shield } from 'lucide-react';
import { apiCall } from '../../utils/api';

export default function Navbar() {
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [notifications, setNotifications] = useState([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  
  const notifRef = useRef(null);
  const profileRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifDropdown(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfileDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return undefined;

    let cancelled = false;
    let interval = null;

    const loadNotifications = async () => {
      try {
        const data = await apiCall('/notifications');
        if (!cancelled) {
          setNotifications(data);
        }
      } catch (err) {
        console.error('Error fetching notifications:', err);
      }
    };

    void loadNotifications();
    interval = window.setInterval(() => {
      void loadNotifications();
    }, 15000);

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
    };
  }, [isAuthenticated]);

  const handleLogout = () => {
    apiCall('/auth/logout', 'POST').catch(() => null).finally(() => {
      dispatch(logout());
      setNotifications([]);
      navigate('/login');
    });
  };

  const markAllRead = async () => {
    try {
      await apiCall('/notifications/read-all', 'PUT');
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const handleNotifClick = async (notif) => {
    if (!notif.read) {
      try {
        await apiCall(`/notifications/${notif.id}/read`, 'PUT');
        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
      } catch (err) {
        console.error(err);
      }
    }
    setShowNotifDropdown(false);
    
    // Redirect based on role
    if (user.role === 'student') {
      if (notif.title.includes('Shortlisted') || notif.title.includes('Status')) {
        navigate('/dashboard/student');
      } else if (notif.title.includes('Resume')) {
        navigate('/resume');
      }
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-50 glass-panel border-b border-white/5 px-6 py-4 flex items-center justify-between">
      {/* Brand Logo */}
      <Link to="/" className="flex items-center gap-2 text-xl font-bold tracking-tight text-white group">
        <div className="p-1.5 rounded-lg bg-indigo-600/30 text-indigo-400 group-hover:scale-110 transition-transform">
          <Sparkles className="w-6 h-6 animate-pulse" />
        </div>
        <span>Career<span className="text-indigo-400">Genie</span></span>
      </Link>

      {/* Navigation Links */}
      <div className="hidden md:flex items-center gap-6">
        {isAuthenticated && (
          <>
            {user.role === 'student' && (
              <>
                <Link 
                  to="/dashboard/student" 
                  className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${isActive('/dashboard/student') ? 'text-indigo-400' : 'text-slate-300 hover:text-white'}`}
                >
                  <LayoutDashboard className="w-4 h-4" /> Dashboard
                </Link>
                <Link 
                  to="/resume" 
                  className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${isActive('/resume') ? 'text-indigo-400' : 'text-slate-300 hover:text-white'}`}
                >
                  <FileText className="w-4 h-4" /> Analyze Resume
                </Link>
                <Link 
                  to="/jobs" 
                  className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${isActive('/jobs') ? 'text-indigo-400' : 'text-slate-300 hover:text-white'}`}
                >
                  <Briefcase className="w-4 h-4" /> Browse Jobs
                </Link>
              </>
            )}

            {user.role === 'recruiter' && (
              <>
                <Link 
                  to="/dashboard/recruiter" 
                  className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${isActive('/dashboard/recruiter') ? 'text-indigo-400' : 'text-slate-300 hover:text-white'}`}
                >
                  <LayoutDashboard className="w-4 h-4" /> Dashboard
                </Link>
                <Link 
                  to="/jobs" 
                  className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${isActive('/jobs') ? 'text-indigo-400' : 'text-slate-300 hover:text-white'}`}
                >
                  <Briefcase className="w-4 h-4" /> Job Board
                </Link>
              </>
            )}

            {user.role === 'admin' && (
              <>
                <Link 
                  to="/dashboard/admin" 
                  className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${isActive('/dashboard/admin') ? 'text-indigo-400' : 'text-slate-300 hover:text-white'}`}
                >
                  <Shield className="w-4 h-4" /> Admin Console
                </Link>
                <Link 
                  to="/jobs" 
                  className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${isActive('/jobs') ? 'text-indigo-400' : 'text-slate-300 hover:text-white'}`}
                >
                  <Briefcase className="w-4 h-4" /> Jobs Manager
                </Link>
              </>
            )}
          </>
        )}
        {!isAuthenticated && (
          <Link 
            to="/jobs" 
            className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${isActive('/jobs') ? 'text-indigo-400' : 'text-slate-300 hover:text-white'}`}
          >
            <Briefcase className="w-4 h-4" /> Explore Jobs
          </Link>
        )}
      </div>

      {/* Action Area */}
      <div className="flex items-center gap-4">
        {isAuthenticated ? (
          <>
            {/* Notification Menu */}
            <div className="relative" ref={notifRef}>
              <button 
                onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                className="relative p-2 rounded-full hover:bg-white/5 text-slate-300 hover:text-white transition-colors"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-[10px] text-white font-bold w-4.5 h-4.5 rounded-full flex items-center justify-center animate-bounce">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifDropdown && (
                <div className="absolute right-0 mt-3 w-80 glass-panel rounded-xl overflow-hidden shadow-2xl z-50 border border-white/10">
                  <div className="p-3 bg-white/5 border-b border-white/5 flex justify-between items-center">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Notifications</span>
                    {unreadCount > 0 && (
                      <button 
                        onClick={markAllRead}
                        className="text-[10px] text-indigo-400 hover:underline cursor-pointer"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>
                  <div className="max-h-64 overflow-y-auto divide-y divide-white/5">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-500">
                        No notifications yet.
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div 
                          key={notif.id} 
                          onClick={() => handleNotifClick(notif)}
                          className={`p-3 text-left hover:bg-white/5 cursor-pointer transition-colors ${!notif.read ? 'bg-indigo-500/10' : ''}`}
                        >
                          <div className="flex justify-between items-start gap-1">
                            <h4 className={`text-xs font-bold ${!notif.read ? 'text-indigo-300' : 'text-slate-200'}`}>
                              {notif.title}
                            </h4>
                            {!notif.read && <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0 mt-1"></span>}
                          </div>
                          <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{notif.message}</p>
                          <span className="text-[9px] text-slate-500 mt-1.5 block">
                            {new Date(notif.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Dropdown */}
            <div className="relative" ref={profileRef}>
              <button 
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white/5 transition-all text-left"
              >
                <img 
                  src={user.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.name)}`} 
                  alt={user.name} 
                  className="w-8 h-8 rounded-full bg-indigo-800/50 border border-white/10"
                />
                <div className="hidden lg:block shrink-0">
                  <h4 className="text-xs font-semibold text-white leading-tight">{user.name}</h4>
                  <span className="text-[10px] text-indigo-400 uppercase font-bold tracking-wider leading-none">{user.role}</span>
                </div>
              </button>

              {showProfileDropdown && (
                <div className="absolute right-0 mt-3 w-48 glass-panel rounded-xl py-1 shadow-2xl z-50 border border-white/10">
                  <div className="px-4 py-2 border-b border-white/5 lg:hidden">
                    <h4 className="text-xs font-semibold text-white">{user.name}</h4>
                    <span className="text-[10px] text-indigo-400 uppercase font-bold tracking-wider">{user.role}</span>
                  </div>
                  
                  {user.role === 'student' && (
                    <Link 
                      to="/dashboard/student" 
                      onClick={() => setShowProfileDropdown(false)}
                      className="flex items-center gap-2 px-4 py-2 text-xs text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
                    >
                      <LayoutDashboard className="w-4 h-4 text-indigo-400" /> Student Profile
                    </Link>
                  )}
                  
                  {user.role === 'recruiter' && (
                    <Link 
                      to="/dashboard/recruiter" 
                      onClick={() => setShowProfileDropdown(false)}
                      className="flex items-center gap-2 px-4 py-2 text-xs text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
                    >
                      <LayoutDashboard className="w-4 h-4 text-indigo-400" /> Recruiter Console
                    </Link>
                  )}

                  {user.role === 'admin' && (
                    <Link 
                      to="/dashboard/admin" 
                      onClick={() => setShowProfileDropdown(false)}
                      className="flex items-center gap-2 px-4 py-2 text-xs text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
                    >
                      <Shield className="w-4 h-4 text-indigo-400" /> Admin Console
                    </Link>
                  )}

                  <button 
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 px-4 py-2 text-xs text-red-400 hover:bg-red-500/10 transition-colors text-left"
                  >
                    <LogOut className="w-4 h-4" /> Sign Out
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center gap-3">
            <Link 
              to="/login" 
              className="text-xs font-semibold text-slate-300 hover:text-white px-4 py-2 transition-colors"
            >
              Sign In
            </Link>
            <Link 
              to="/register" 
              className="text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg transition-colors shadow-lg shadow-indigo-600/20"
            >
              Register
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
