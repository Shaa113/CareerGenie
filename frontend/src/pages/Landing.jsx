import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView, useScroll, useTransform } from 'framer-motion';
import {
  Sparkles,
  FileText,
  ChevronRight,
  Briefcase,
  TrendingUp,
  Zap,
  ShieldCheck,
  BarChart3,
  ArrowRight,
  Star,
  CheckCircle2,
  Search
} from 'lucide-react';
import BlurText from '../components/reactbits/BlurText';

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, delay: i * 0.12, ease: [0.25, 0.46, 0.45, 0.94] }
  })
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.85 },
  visible: (i = 0) => ({
    opacity: 1,
    scale: 1,
    transition: { duration: 0.7, delay: i * 0.13, ease: [0.25, 0.46, 0.45, 0.94] }
  })
};

function Reveal({ children, variants = fadeUp, custom = 0, className = '' }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={variants}
      custom={custom}
      className={className}
    >
      {children}
    </motion.div>
  );
}

const stats = [
  { value: '95%', label: 'ATS score precision' },
  { value: '10K+', label: 'Resumes parsed' },
  { value: '2.4s', label: 'Typical parse time' },
  { value: '500+', label: 'Active roles' }
];

const features = [
  {
    icon: FileText,
    title: 'AI Resume Parser',
    desc: 'Extracts experience, education, and skills in seconds, then scores the resume against ATS expectations.',
    color: 'indigo'
  },
  {
    icon: Briefcase,
    title: 'Smart Job Matcher',
    desc: 'Ranks roles by fit, flags skill gaps, and surfaces the opportunities that are actually worth your time.',
    color: 'purple'
  },
  {
    icon: TrendingUp,
    title: 'Career Tracker',
    desc: 'Keep every application, interview, and follow-up in one calm, organized dashboard.',
    color: 'pink'
  },
  {
    icon: ShieldCheck,
    title: 'Recruiter Panels',
    desc: 'Post openings, rank candidates, and manage the hiring pipeline without bouncing between tools.',
    color: 'violet'
  },
  {
    icon: BarChart3,
    title: 'Analytics Engine',
    desc: 'See platform usage, moderation, and performance metrics at a glance.',
    color: 'blue'
  },
  {
    icon: Zap,
    title: 'Instant Feedback',
    desc: 'Get clear improvement suggestions before you submit anything important.',
    color: 'amber'
  }
];

const colorMap = {
  indigo: { bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'hover:border-indigo-500/30', shadow: 'hover:shadow-indigo-500/5' },
  purple: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'hover:border-purple-500/30', shadow: 'hover:shadow-purple-500/5' },
  pink: { bg: 'bg-pink-500/10', text: 'text-pink-400', border: 'hover:border-pink-500/30', shadow: 'hover:shadow-pink-500/5' },
  violet: { bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'hover:border-violet-500/30', shadow: 'hover:shadow-violet-500/5' },
  blue: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'hover:border-blue-500/30', shadow: 'hover:shadow-blue-500/5' },
  amber: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'hover:border-amber-500/30', shadow: 'hover:shadow-amber-500/5' }
};

const steps = [
  { num: '01', title: 'Upload Resume', desc: 'Drop in a PDF and let the parser handle the extraction.' },
  { num: '02', title: 'Review Insights', desc: 'See ATS score, keyword gaps, and practical improvement notes.' },
  { num: '03', title: 'Apply Smarter', desc: 'Browse matching roles and submit with less friction.' },
  { num: '04', title: 'Stay Organized', desc: 'Track every application status from a single dashboard.' }
];

const testimonials = [
  { name: 'Priya Sharma', role: 'CS Student, IIT Delhi', text: 'CareerGenie helped me tighten my resume fast. The experience felt focused instead of overwhelming.' },
  { name: 'Rahul Verma', role: 'MBA, XLRI', text: 'The role matching is crisp and practical. It showed me positions I would have missed on my own.' },
  { name: 'Ananya Joshi', role: 'Recruiter, TechCorp', text: 'Candidate ranking is easy to scan and easy to trust. It saves real time every week.' }
];

const dashboardHighlights = [
  'Resume score and keyword coverage',
  'Recommended jobs ranked by fit',
  'Applications, interviews, and follow-ups in one place'
];

export default function Landing() {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: containerRef });
  const heroOpacity = useTransform(scrollYProgress, [0, 0.18], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.18], [1, 0.92]);

  return (
    <div ref={containerRef} className="relative w-full overflow-hidden">
      <div className="landing-ether-bg">
        <div className="landing-ether-orb landing-ether-orb-a" />
        <div className="landing-ether-orb landing-ether-orb-b" />
        <div className="landing-ether-orb landing-ether-orb-c" />
      </div>

      <motion.section
        style={{ opacity: heroOpacity, scale: heroScale }}
        className="relative z-10 min-h-screen px-6 py-10 md:py-16"
      >
        <div className="max-w-7xl mx-auto min-h-[calc(100vh-5rem)] flex items-center">
          <div className="landing-hero-grid w-full">
            <div className="max-w-2xl">
              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.15 }}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-indigo-200 text-xs font-semibold mb-7 backdrop-blur-sm"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Polished career infrastructure for modern teams
              </motion.div>

              <BlurText
                text="Build your future"
                animateBy="words"
                direction="top"
                delay={120}
                stepDuration={0.28}
                className="landing-hero-title"
              />

              <BlurText
                text="with clarity, confidence, and momentum."
                animateBy="words"
                direction="top"
                delay={90}
                stepDuration={0.22}
                className="landing-hero-subtitle"
              />

              <motion.p
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.8 }}
                className="landing-hero-copy"
              >
                CareerGenie brings resume analysis, job matching, and application tracking into one
                calm, premium workflow for students, recruiters, and admins.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 1.05 }}
                className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mt-9"
              >
                <Link to="/register" className="landing-btn-primary group">
                  Start free <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link to="/jobs" className="landing-btn-outline group">
                  View jobs <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 1.2 }}
                className="mt-8 flex flex-wrap gap-3"
              >
                {['Resume parsing', 'Smart matching', 'Progress tracking'].map((item) => (
                  <div key={item} className="landing-chip">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-300" />
                    <span>{item}</span>
                  </div>
                ))}
              </motion.div>
            </div>

            <motion.aside
              initial={{ opacity: 0, y: 26, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.9, delay: 0.5 }}
              className="landing-hero-panel"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="landing-panel-label">CareerGenie workspace</p>
                  <h2 className="text-white text-xl font-semibold tracking-tight mt-1">Your next move, organized</h2>
                </div>
                <div className="px-3 py-1.5 rounded-full bg-emerald-400/10 border border-emerald-400/20 text-emerald-300 text-xs font-semibold">
                  Live
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="landing-metric-card">
                  <span className="landing-metric-value">91%</span>
                  <span className="landing-metric-label">Avg ATS score</span>
                </div>
                <div className="landing-metric-card">
                  <span className="landing-metric-value">18</span>
                  <span className="landing-metric-label">Matches today</span>
                </div>
                <div className="landing-metric-card">
                  <span className="landing-metric-value">7</span>
                  <span className="landing-metric-label">Open interviews</span>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-white">
                    <Search className="w-4 h-4 text-indigo-300" />
                    Recommended next actions
                  </div>
                  <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Today</div>
                </div>
                <div className="space-y-3">
                  {dashboardHighlights.map((item, index) => (
                    <div key={item} className="flex items-start gap-3 rounded-xl bg-white/[0.03] border border-white/5 px-3 py-3">
                      <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-300 text-xs font-semibold">
                        {index + 1}
                      </div>
                      <p className="text-sm text-slate-300 leading-relaxed">{item}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                <div>
                  <div className="text-sm font-semibold text-white">Suggested fit</div>
                  <div className="text-xs text-slate-400 mt-1">Product Analyst at Atlas Labs</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold text-indigo-300">94%</div>
                  <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">match</div>
                </div>
              </div>
            </motion.aside>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.45, duration: 0.9 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 hidden md:block"
        >
          <div className="landing-scroll-indicator">
            <div className="landing-scroll-dot" />
          </div>
        </motion.div>
      </motion.section>

      <section className="relative z-10 py-20 border-t border-white/5">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((s, i) => (
            <Reveal key={s.label} custom={i} className="text-center">
              <div className="landing-stat-value">{s.value}</div>
              <div className="text-xs md:text-sm text-slate-500 mt-1 uppercase tracking-wider font-medium">{s.label}</div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="relative z-10 py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <div className="text-center mb-16">
              <span className="text-indigo-400 text-xs font-bold uppercase tracking-[0.2em]">Capabilities</span>
              <BlurText
                text="Everything you need to move with confidence"
                animateBy="words"
                direction="top"
                delay={45}
                stepDuration={0.18}
                className="landing-section-title mt-3"
              />
            </div>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => {
              const c = colorMap[f.color];

              return (
                <Reveal key={f.title} variants={scaleIn} custom={i}>
                  <div className={`landing-feature-card ${c.border} ${c.shadow}`}>
                    <div className={`w-11 h-11 rounded-xl ${c.bg} ${c.text} flex items-center justify-center mb-5`}>
                      <f.icon className="w-5 h-5" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">{f.title}</h3>
                    <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      <section className="relative z-10 py-24 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <div className="text-center mb-16">
              <span className="text-purple-400 text-xs font-bold uppercase tracking-[0.2em]">Workflow</span>
              <h2 className="landing-section-title mt-3">Four steps to launch</h2>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((s, i) => (
              <Reveal key={s.num} custom={i} variants={fadeUp}>
                <div className="landing-step-card group">
                  <span className="landing-step-num">{s.num}</span>
                  <h4 className="text-base font-bold text-white mt-4 mb-2 group-hover:text-indigo-300 transition-colors">
                    {s.title}
                  </h4>
                  <p className="text-sm text-slate-400 leading-relaxed">{s.desc}</p>
                  {i < steps.length - 1 && (
                    <div className="hidden lg:block absolute top-1/2 -right-3 w-6 h-px bg-gradient-to-r from-indigo-500/40 to-transparent" />
                  )}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10 py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <div className="text-center mb-16">
              <span className="text-pink-400 text-xs font-bold uppercase tracking-[0.2em]">Testimonials</span>
              <h2 className="landing-section-title mt-3">Trusted by students and hiring teams</h2>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <Reveal key={t.name} variants={fadeUp} custom={i}>
                <div className="landing-testimonial-card">
                  <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, j) => (
                      <Star key={j} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed mb-6 italic">"{t.text}"</p>
                  <div className="flex items-center gap-3 mt-auto">
                    <img
                      src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(t.name)}&backgroundColor=6366f1`}
                      alt={t.name}
                      className="w-9 h-9 rounded-full border border-white/10"
                    />
                    <div>
                      <div className="text-sm font-semibold text-white">{t.name}</div>
                      <div className="text-[11px] text-slate-500">{t.role}</div>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10 py-28 px-6">
        <Reveal>
          <div className="max-w-3xl mx-auto text-center">
            <div className="landing-cta-glow" />
            <h2 className="landing-section-title leading-tight mx-auto">
              Ready to make your next move feel effortless?
            </h2>
            <p className="text-slate-400 mt-5 max-w-lg mx-auto leading-relaxed">
              Join students and recruiters already using CareerGenie to keep their workflows focused and organized.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
              <Link to="/register" className="landing-btn-primary group">
                Create free account <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link to="/login" className="landing-btn-outline group">
                Sign in <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>
        </Reveal>
      </section>

      <footer className="relative z-10 border-t border-white/5 py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2 text-white font-bold text-lg">
            <div className="p-1.5 rounded-lg bg-indigo-600/30 text-indigo-400">
              <Sparkles className="w-5 h-5" />
            </div>
            Career<span className="text-indigo-400">Genie</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-slate-500">
            <Link to="/jobs" className="hover:text-white transition-colors">Jobs</Link>
            <Link to="/register" className="hover:text-white transition-colors">Register</Link>
            <Link to="/login" className="hover:text-white transition-colors">Sign In</Link>
          </div>
          <div className="text-xs text-slate-600">
            &copy; {new Date().getFullYear()} CareerGenie. University Mini Project.
          </div>
        </div>
      </footer>
    </div>
  );
}
