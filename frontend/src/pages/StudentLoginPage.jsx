import React, { useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { login, reset } from '../features/auth/authSlice';
import { toast } from 'react-toastify';
import {
  GraduationCap, Lock, Eye, EyeOff, ArrowLeft, Loader, User,
  BookOpen, Wallet, BarChart3, Award, Sparkles, Shield, ChevronRight
} from 'lucide-react';
import logoImage from '../assets/logo2.png';

// ─── Animated Particles ────────────────────────────────────────────
const ParticleField = () => {
  const particles = useMemo(() =>
    Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 2 + Math.random() * 4,
      speed: 0.3 + Math.random() * 0.7,
      delay: Math.random() * 5,
      duration: 8 + Math.random() * 12,
      opacity: 0.15 + Math.random() * 0.35,
    })), []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full bg-white animate-float"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            opacity: p.opacity,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) translateX(0); }
          25% { transform: translateY(-20px) translateX(10px); }
          50% { transform: translateY(-10px) translateX(-10px); }
          75% { transform: translateY(-25px) translateX(5px); }
        }
        .animate-float { animation: float ease-in-out infinite; }
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-gradient { animation: gradientShift 8s ease infinite; background-size: 200% 200%; }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-up { animation: fadeInUp 0.6s ease-out forwards; }
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(-30px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-slide-right { animation: slideInRight 0.5s ease-out forwards; }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.15); }
          50% { box-shadow: 0 0 40px rgba(59, 130, 246, 0.3); }
        }
        .animate-glow { animation: pulseGlow 3s ease-in-out infinite; }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .animate-shimmer {
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent);
          background-size: 200% 100%;
          animation: shimmer 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

// ─── Floating Icon ──────────────────────────────────────────────────
const FloatingIcon = ({ Icon, className, delay = 0 }) => (
  <div
    className={`absolute opacity-[0.08] animate-float ${className}`}
    style={{ animationDelay: `${delay}s`, animationDuration: `${10 + delay}s` }}
  >
    <Icon size={48} className="text-white" />
  </div>
);

// ─── Main Component ─────────────────────────────────────────────────
const StudentLoginPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { user, isLoading, isError, isSuccess, message } = useSelector(s => s.auth);
  const { register, handleSubmit, formState: { errors } } = useForm();

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (isError) toast.error(message);
    if (isSuccess && user) {
      if (user.role === 'Student') {
        toast.success(`Welcome back, ${user.name || 'Student'}! 🎓`);
        navigate('/student/home');
      } else {
        toast.error('This portal is for students only.');
        dispatch(reset());
      }
    }
    dispatch(reset());
  }, [user, isError, isSuccess, message, navigate, dispatch]);

  const onSubmit = (data) => {
    dispatch(login({ email: data.email, password: data.password, role: 'Student' }));
  };

  const features = [
    { icon: BookOpen, label: 'Study Materials', color: 'from-emerald-400 to-teal-500' },
    { icon: Wallet, label: 'Fee Details', color: 'from-blue-400 to-indigo-500' },
    { icon: BarChart3, label: 'Exam Results', color: 'from-purple-400 to-pink-500' },
    { icon: Award, label: 'Course Info', color: 'from-amber-400 to-orange-500' },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-50">

      {/* ─── LEFT PANEL — Branding ─────────────────────────────── */}
      <div
        className="hidden md:flex md:w-1/2 relative overflow-hidden flex-col justify-between animate-gradient"
        style={{
          background: 'linear-gradient(-45deg, #1e3a5f, #1e40af, #0f172a, #1e3a5f)',
          backgroundSize: '400% 400%',
        }}
      >
        <ParticleField />

        {/* Floating decorative icons */}
        <FloatingIcon Icon={GraduationCap} className="top-[12%] right-[15%]" delay={0} />
        <FloatingIcon Icon={BookOpen} className="bottom-[25%] left-[10%]" delay={1.5} />
        <FloatingIcon Icon={Award} className="top-[40%] left-[20%]" delay={3} />

        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-black/10" />
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-transparent" />

        {/* Animated grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.2) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between h-full p-10 lg:p-14">

          {/* Top */}
          <div>
            <Link to="/"
              className="inline-flex items-center gap-2 text-blue-200/80 hover:text-white transition-all duration-300 text-sm font-medium group w-fit"
            >
              <span className="group-hover:-translate-x-1 transition-transform duration-300">
                <ArrowLeft size={15} />
              </span>
              Back to Home
            </Link>
          </div>

          {/* Center */}
          <div className="space-y-8" style={{ animation: mounted ? 'fadeInUp 0.8s ease-out' : 'none' }}>
            {/* Logo */}
            <div className="flex items-center gap-4">
              <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-3 border border-white/10 shadow-2xl">
                <img src={logoImage} alt="Smart Institute" className="h-14 w-auto object-contain" />
              </div>
              <div className="h-10 w-px bg-white/10" />
              <div className="flex items-center gap-2">
                <GraduationCap className="text-yellow-300" size={24} />
                <span className="text-white/60 text-xs font-semibold uppercase tracking-[0.2em]">Student Portal</span>
              </div>
            </div>

            {/* Heading */}
            <div className="space-y-4">
              <h1 className="text-4xl lg:text-5xl font-black text-white leading-[1.1]">
                Your Learning
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-yellow-300 to-orange-300">
                  Journey Starts Here
                </span>
              </h1>
              <p className="text-blue-100/70 text-base lg:text-lg leading-relaxed max-w-md font-light">
                Access your courses, fees, study materials, and exam results — everything you need in one place.
              </p>
            </div>

            {/* Feature badges */}
            <div className="flex flex-wrap gap-2.5">
              {features.map((f, i) => (
                <span
                  key={f.label}
                  className="inline-flex items-center gap-1.5 bg-white/5 backdrop-blur-md text-white/80 text-xs font-semibold px-3.5 py-2 rounded-full border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300 cursor-default"
                  style={{ animationDelay: `${0.3 + i * 0.1}s` }}
                >
                  <f.icon size={12} />
                  {f.label}
                </span>
              ))}
            </div>
          </div>

          {/* Bottom */}
          <div className="flex items-center justify-between">
            <p className="text-blue-300/40 text-xs">
              © {new Date().getFullYear()} Smart Institute. All rights reserved.
            </p>
            <div className="flex items-center gap-1.5 text-blue-300/30 text-xs">
              <Shield size={10} />
              Secured Portal
            </div>
          </div>
        </div>
      </div>

      {/* ─── RIGHT PANEL — Form ────────────────────────────────── */}
      <div className="flex-1 flex flex-col bg-gradient-to-br from-gray-50 via-white to-gray-50 relative">

        {/* Mobile top bar */}
        <div className="md:hidden flex items-center justify-between px-5 py-4 bg-white/80 backdrop-blur-md border-b border-gray-100 z-20">
          <Link to="/" className="flex items-center gap-2 text-gray-500 hover:text-blue-700 text-sm font-semibold transition-colors">
            <ArrowLeft size={16} /> Home
          </Link>
          <div className="flex items-center gap-2">
            <GraduationCap size={16} className="text-blue-600" />
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Student</span>
          </div>
          <img src={logoImage} alt="Smart Institute" className="h-8 w-auto object-contain" />
        </div>

        {/* Decorative corner element */}
        <div className="hidden md:block absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-blue-50 to-transparent rounded-bl-full pointer-events-none" />
        <div className="hidden md:block absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-indigo-50 to-transparent rounded-tr-full pointer-events-none" />

        {/* Form area */}
        <div className="flex-1 flex items-center justify-center px-5 py-10 md:py-16 relative z-10">
          <div
            className="w-full max-w-md"
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? 'translateY(0)' : 'translateY(20px)',
              transition: 'opacity 0.6s ease-out, transform 0.6s ease-out',
            }}
          >

            {/* Header */}
            <div className="mb-8 text-center md:text-left">
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 text-xs font-bold uppercase tracking-widest px-3.5 py-2 rounded-full border border-blue-100/80 mb-5 shadow-sm">
                <GraduationCap size={13} />
                Student Login
              </div>
              <h2 className="text-3xl md:text-4xl font-black text-gray-900 leading-tight">
                Welcome Back!
              </h2>
              <p className="text-gray-400 mt-2 text-sm leading-relaxed">
                Sign in with your enrollment credentials to access your dashboard.
              </p>
            </div>

            {/* Form Card */}
            <div className="relative">
              {/* Glow effect */}
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-200 via-indigo-200 to-purple-200 rounded-3xl blur-xl opacity-30 animate-glow" />

              <div className="relative bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl shadow-gray-200/70 border border-gray-100/80 p-7 md:p-8">

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

                  {/* Username / Enrollment */}
                  <div className="animate-fade-up" style={{ animationDelay: '0.1s' }}>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">
                      Username / Enrollment No.
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none transition-colors duration-300 group-focus-within:text-blue-600">
                        <User size={17} className="text-gray-400 group-focus-within:text-blue-500 transition-colors duration-300" />
                      </div>
                      <input
                        type="text"
                        autoComplete="username"
                        placeholder="Enter your username"
                        className={`w-full pl-10 pr-4 py-3 border-2 rounded-xl text-sm font-medium text-gray-900 placeholder:text-gray-400 outline-none transition-all duration-300
                          ${errors.email
                            ? 'border-red-300 bg-red-50/50 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
                            : 'border-gray-200 bg-gray-50/80 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10'
                          }
                          hover:border-gray-300`}
                        {...register('email', { required: 'Username is required' })}
                      />
                      {/* Focus indicator line */}
                      <div className="absolute bottom-0 left-3 right-3 h-0.5 bg-blue-500 scale-x-0 group-focus-within:scale-x-100 transition-transform duration-300 rounded-full opacity-50" />
                    </div>
                    {errors.email && (
                      <p className="text-xs text-red-500 mt-1.5 font-medium flex items-center gap-1">
                        <span className="w-1 h-1 bg-red-500 rounded-full" />
                        {errors.email.message}
                      </p>
                    )}
                  </div>

                  {/* Password */}
                  <div className="animate-fade-up" style={{ animationDelay: '0.2s' }}>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Password</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none transition-colors duration-300 group-focus-within:text-blue-600">
                        <Lock size={17} className="text-gray-400 group-focus-within:text-blue-500 transition-colors duration-300" />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        placeholder="••••••••"
                        className={`w-full pl-10 pr-11 py-3 border-2 rounded-xl text-sm font-medium text-gray-900 placeholder:text-gray-400 outline-none transition-all duration-300
                          ${errors.password
                            ? 'border-red-300 bg-red-50/50 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
                            : 'border-gray-200 bg-gray-50/80 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10'
                          }
                          hover:border-gray-300`}
                        {...register('password', { required: 'Password is required' })}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(p => !p)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 transition-colors duration-300 group/toggle"
                      >
                        {showPassword
                          ? <EyeOff size={17} className="group-hover/toggle:scale-110 transition-transform duration-200" />
                          : <Eye size={17} className="group-hover/toggle:scale-110 transition-transform duration-200" />
                        }
                      </button>
                      {/* Focus indicator line */}
                      <div className="absolute bottom-0 left-3 right-3 h-0.5 bg-blue-500 scale-x-0 group-focus-within:scale-x-100 transition-transform duration-300 rounded-full opacity-50" />
                    </div>
                    {errors.password && (
                      <p className="text-xs text-red-500 mt-1.5 font-medium flex items-center gap-1">
                        <span className="w-1 h-1 bg-red-500 rounded-full" />
                        {errors.password.message}
                      </p>
                    )}
                  </div>

                  {/* Submit Button */}
                  <div className="animate-fade-up pt-1" style={{ animationDelay: '0.3s' }}>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="relative w-full group overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 rounded-xl opacity-100 group-hover:opacity-90 transition-opacity duration-300" />
                      {/* Shimmer overlay */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 rounded-xl" />
                      <div className="relative flex items-center justify-center gap-2.5 py-3.5 px-4 font-bold text-white text-sm">
                        {isLoading ? (
                          <>
                            <Loader size={18} className="animate-spin" />
                            <span>Signing In...</span>
                          </>
                        ) : (
                          <>
                            <GraduationCap size={18} />
                            <span>Sign In to Student Portal</span>
                            <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform duration-300" />
                          </>
                        )}
                      </div>
                    </button>
                  </div>

                </form>

                {/* Divider */}
                <div className="relative my-6 animate-fade-up" style={{ animationDelay: '0.35s' }}>
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-100" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="px-3 text-[10px] font-bold text-gray-300 uppercase tracking-widest bg-white">
                      Secure Login
                    </span>
                  </div>
                </div>

                {/* Trust indicators */}
                <div className="flex items-center justify-center gap-3 text-center animate-fade-up" style={{ animationDelay: '0.4s' }}>
                  <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                    <Shield size={11} className="text-green-400" />
                    <span>SSL Encrypted</span>
                  </div>
                  <span className="text-gray-200">|</span>
                  <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                    <Sparkles size={11} className="text-blue-400" />
                    <span>Secure Connection</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer links */}
            <div className="mt-7 space-y-2 text-center animate-fade-up" style={{ animationDelay: '0.45s' }}>
              <p className="text-xs text-gray-400">
                Forgot your credentials?{' '}
                <Link to="/contact" className="text-blue-600 font-semibold hover:text-blue-700 hover:underline transition-colors">
                  Contact your institute
                </Link>
              </p>
              <div className="flex items-center justify-center gap-2">
                <span className="w-6 h-px bg-gray-200" />
                <p className="text-[11px] text-gray-400">
                  Are you staff?{' '}
                  <Link to="/login" className="text-gray-600 font-semibold hover:text-gray-800 hover:underline transition-colors">
                    Admin Login →
                  </Link>
                </p>
                <span className="w-6 h-px bg-gray-200" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentLoginPage;
