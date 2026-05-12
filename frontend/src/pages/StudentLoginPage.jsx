import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { login, reset } from '../features/auth/authSlice';
import { toast } from 'react-toastify';
import { GraduationCap, Lock, Eye, EyeOff, ArrowLeft, Loader, User } from 'lucide-react';
import logoImage from '../assets/logo2.png';

const StudentLoginPage = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const [showPassword, setShowPassword] = useState(false);
    const { user, isLoading, isError, isSuccess, message } = useSelector(s => s.auth);
    const { register, handleSubmit, formState: { errors } } = useForm();

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

    return (
        <div className="min-h-screen flex flex-col md:flex-row">

            {/* Left Panel — Branding */}
            <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 relative overflow-hidden flex-col justify-between p-12">
                {/* Decorative blobs */}
                <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                    <div className="absolute top-10 left-10 w-72 h-72 bg-white/5 rounded-full blur-3xl" />
                    <div className="absolute bottom-10 right-10 w-96 h-96 bg-indigo-400/10 rounded-full blur-3xl" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-300/5 rounded-full blur-2xl" />
                </div>

                {/* Top — Back link */}
                <Link to="/" className="relative z-10 inline-flex items-center gap-2 text-blue-200 hover:text-white transition-colors text-sm font-medium w-fit">
                    <ArrowLeft size={16} /> Back to Home
                </Link>

                {/* Center — Content */}
                <div className="relative z-10 space-y-8">
                    <img src={logoImage} alt="Smart Institute" className="h-20 w-auto object-contain bg-white/10 rounded-2xl p-3 backdrop-blur-sm" />
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <GraduationCap className="text-yellow-300" size={32} />
                            <h1 className="text-4xl font-black text-white leading-tight">Student Portal</h1>
                        </div>
                        <p className="text-blue-100/80 text-lg leading-relaxed max-w-sm">
                            Access your courses, fees, study materials, and exam results — all in one place.
                        </p>
                    </div>

                    {/* Feature pills */}
                    <div className="flex flex-wrap gap-2">
                        {['📚 Study Materials', '💰 Fee Details', '📊 Exam Results', '🎓 Course Info'].map(f => (
                            <span key={f} className="bg-white/10 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1.5 rounded-full border border-white/20">
                                {f}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Bottom */}
                <p className="relative z-10 text-blue-300/50 text-xs">
                    © {new Date().getFullYear()} Smart Institute. All rights reserved.
                </p>
            </div>

            {/* Right Panel — Form */}
            <div className="flex-1 flex flex-col min-h-screen md:min-h-0 bg-gray-50">

                {/* Mobile top bar */}
                <div className="md:hidden flex items-center justify-between px-5 py-4 bg-white border-b border-gray-100 shadow-sm">
                    <Link to="/" className="flex items-center gap-2 text-gray-500 hover:text-blue-700 text-sm font-semibold transition-colors">
                        <ArrowLeft size={16} /> Home
                    </Link>
                    <img src={logoImage} alt="Smart Institute" className="h-9 w-auto object-contain" />
                </div>

                {/* Form area */}
                <div className="flex-1 flex items-center justify-center px-6 py-12">
                    <div className="w-full max-w-md">

                        {/* Header */}
                        <div className="mb-8 text-center md:text-left">
                            <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full border border-blue-100 mb-4">
                                <GraduationCap size={14} /> Student Login
                            </div>
                            <h2 className="text-3xl font-black text-gray-900">Welcome Back!</h2>
                            <p className="text-gray-500 mt-1.5 text-sm">Sign in with your enrollment credentials.</p>
                        </div>

                        {/* Card */}
                        <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/60 border border-gray-100 p-8">
                            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

                                {/* Username / Enrollment */}
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5">
                                        Username / Enrollment No.
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                            <User size={17} className="text-gray-400" />
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="Enter your username"
                                            className={`w-full pl-10 pr-4 py-3 border rounded-xl text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all ${errors.email ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-gray-50 focus:bg-white'}`}
                                            {...register('email', { required: 'Username is required' })}
                                        />
                                    </div>
                                    {errors.email && <p className="text-xs text-red-500 mt-1 font-medium">{errors.email.message}</p>}
                                </div>

                                {/* Password */}
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Password</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                            <Lock size={17} className="text-gray-400" />
                                        </div>
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            placeholder="••••••••"
                                            className={`w-full pl-10 pr-11 py-3 border rounded-xl text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all ${errors.password ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-gray-50 focus:bg-white'}`}
                                            {...register('password', { required: 'Password is required' })}
                                        />
                                        <button type="button" onClick={() => setShowPassword(p => !p)}
                                            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 transition-colors">
                                            {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                                        </button>
                                    </div>
                                    {errors.password && <p className="text-xs text-red-500 mt-1 font-medium">{errors.password.message}</p>}
                                </div>

                                {/* Submit */}
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full flex items-center justify-center gap-2 py-3.5 bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white font-bold rounded-xl shadow-lg shadow-blue-700/25 hover:shadow-blue-700/40 transition-all disabled:opacity-60 disabled:cursor-not-allowed text-sm mt-2"
                                >
                                    {isLoading
                                        ? <><Loader size={18} className="animate-spin" /> Signing In...</>
                                        : <><GraduationCap size={18} /> Sign In to Student Portal</>
                                    }
                                </button>
                            </form>
                        </div>

                        {/* Footer note */}
                        <p className="text-center text-xs text-gray-400 mt-6">
                            Forgot your credentials?{' '}
                            <Link to="/contact" className="text-blue-600 font-semibold hover:underline">
                                Contact your institute
                            </Link>
                        </p>

                        {/* Admin login link */}
                        <p className="text-center text-xs text-gray-400 mt-2">
                            Are you staff?{' '}
                            <Link to="/login" className="text-gray-600 font-semibold hover:underline">
                                Admin Login →
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentLoginPage;
