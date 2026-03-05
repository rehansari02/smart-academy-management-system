import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../../features/auth/authSlice';
import { Menu, X, ChevronDown, LogOut, User as UserIcon } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import ProfileSettingsModal from '../user/ProfileSettingsModal';
import logoImage from '../../assets/logo2.png';

const StudentNavbar = () => {
    const { user } = useSelector((state) => state.auth);
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const location = useLocation();

    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [hoveredMenu, setHoveredMenu] = useState(null);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

    const handleLogout = async () => {
        dispatch(logout());
        navigate('/');
    };

    const MENU_ITEMS = [
        { title: 'Home', path: '/student/home' },
        { 
            title: 'Course', 
            path: '#', 
            subItems: [
                { title: 'Course Detail', path: '/student/course-detail' },
                { title: 'Course Feedback', path: '/student/course-feedback' }
            ]
        },
        { 
            title: 'Study', 
            path: '#',
            subItems: [
                { title: 'Free Study Material', path: '/student/study/materials' },
                { title: 'Free Learning', path: '/student/study/free-learning' },
                { title: 'Free Learning Progress Report', path: '/student/study/free-learning-report' },
            ] 
        },
        { title: 'Blogs', path: '#' },
        { title: 'Fees', path: '/student/fees' },
        { title: 'Exam', path: '#' },
        { title: 'Complain', path: '#' },
        { title: 'Connect', path: '#' },
    ];

    return (
        <>
            <header className="fixed top-0 w-full z-50 bg-white shadow-md border-b border-gray-200 h-18">
                <div className="container mx-auto px-4 h-full">
                    <div className="flex justify-between items-center h-full">
                        {/* Logo */}
                        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/student/home')}>
                             <img src={logoImage} alt="Smart Institute" className="h-14 w-auto object-contain" />
                        </div>

                        {/* Desktop Nav */}
                        <nav className="hidden lg:flex items-center gap-1 h-full">
                            {MENU_ITEMS.map((item, index) => (
                                <div key={index} 
                                     className="relative h-full flex items-center px-1"
                                     onMouseEnter={() => setHoveredMenu(index)}
                                     onMouseLeave={() => setHoveredMenu(null)}
                                >
                                    {item.subItems ? (
                                        <>
                                            <button 
                                                aria-expanded={hoveredMenu === index}
                                                aria-haspopup="menu"
                                                onFocus={() => setHoveredMenu(index)}
                                                onBlur={(e) => {
                                                    if (!e.currentTarget.parentElement?.contains(e.relatedTarget)) {
                                                        setHoveredMenu(null);
                                                    }
                                                }}
                                                className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-bold transition-all duration-200 
                                                    ${hoveredMenu === index ? 'text-primary bg-blue-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}>
                                                {item.title}
                                                <ChevronDown size={14} className={`transition-transform duration-200 ${hoveredMenu === index ? 'rotate-180 text-primary' : 'text-gray-400'}`}/>
                                            </button>
                                            <AnimatePresence>
                                                {hoveredMenu === index && (
                                                    <motion.div 
                                                        initial={{ opacity: 0, y: 10 }} 
                                                        animate={{ opacity: 1, y: 0 }} 
                                                        exit={{ opacity: 0, y: 10 }} 
                                                        transition={{ duration: 0.2 }} 
                                                        className="absolute left-0 top-full pt-0 w-48 z-50"
                                                    >
                                                        <div className="bg-white text-gray-800 shadow-xl rounded-md overflow-hidden border border-gray-200 ring-1 ring-black/5">
                                                            <div className="h-1 bg-primary w-full"></div>
                                                            {item.subItems.map((sub, idx) => (
                                                                <Link key={idx} to={sub.path} className="block px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-primary border-l-4 border-transparent hover:border-primary transition-all">
                                                                    {sub.title}
                                                                </Link>
                                                            ))}
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </>
                                    ) : (
                                        <Link to={item.path} className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-bold transition-all duration-200 
                                            ${location.pathname.startsWith(item.path) && item.path !== '#' ? 'text-primary bg-blue-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}>
                                            {item.title}
                                        </Link>
                                    )}
                                </div>
                            ))}
                        </nav>

                        {/* User Profile & Logout */}
                        <div className="flex items-center gap-4">
                            <div className="hidden md:flex items-center gap-4 cursor-pointer group p-2 rounded-lg hover:bg-gray-50 transition-colors border-r border-gray-200 pr-5 mr-2"
                                 onClick={() => setIsProfileModalOpen(true)}>
                                <div className="flex flex-col items-end text-right">
                                    <span className="text-sm font-bold text-gray-900 leading-tight group-hover:text-primary transition-colors">
                                        {user?.firstName && user?.lastName 
                                            ? `${user.firstName}${user.middleName ? ' ' + user.middleName : ''} ${user.lastName}`.trim()
                                            : user?.name || 'Student'
                                        }
                                    </span>
                                    <span className="text-[10px] font-bold text-primary uppercase tracking-widest mt-0.5">
                                        {user?.branchName || 'Main'}
                                    </span>
                                    <span className="text-xs text-gray-500 font-medium">{user?.role || 'Student'}</span>
                                    
                                </div>
                                <div className="w-12 h-12 rounded-full bg-gray-100 overflow-hidden border-2 border-white shadow-sm ring-2 ring-gray-100 group-hover:ring-primary/20 transition-all flex items-center justify-center">
                                     {user?.photo ? (
                                        <img src={user.photo} alt={user.name} className="w-full h-full object-cover" />
                                     ) : (
                                        <UserIcon className="text-gray-400 w-7 h-7" />
                                     )}
                                </div>
                            </div>

                            <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-md transition-all duration-300 border border-red-100 font-medium text-sm">
                                <LogOut size={16} />
                                <span className="hidden md:inline">Logout</span>
                            </button>

                            <button className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile Menu */}
                <AnimatePresence>
                    {isMobileMenuOpen && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="lg:hidden bg-white border-t border-gray-200 shadow-xl absolute w-full left-0 top-18 z-40">
                            <div className="py-2">
                                {MENU_ITEMS.map((item, index) => (
                                    <div key={index}>
                                        {item.subItems ? (
                                            <>
                                                <div className="px-4 py-3 font-bold text-gray-800 bg-gray-50 border-y border-gray-100 flex items-center justify-between">
                                                    {item.title}
                                                </div>
                                                <div className="bg-white">
                                                    {item.subItems.map((sub, idx) => (
                                                        <Link key={idx} to={sub.path} className="block px-8 py-3 text-sm font-medium text-gray-600 hover:bg-blue-50 hover:text-primary transition-colors border-b border-gray-50" onClick={() => setIsMobileMenuOpen(false)}>
                                                            {sub.title}
                                                        </Link>
                                                    ))}
                                                </div>
                                            </>
                                        ) : (
                                            <Link to={item.path} className="block px-4 py-4 font-bold text-gray-800 hover:bg-gray-50 hover:text-primary transition-colors border-b border-gray-100" onClick={() => setIsMobileMenuOpen(false)}>
                                                {item.title}
                                            </Link>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </header>
            
            <ProfileSettingsModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />
        </>
    );
};

export default StudentNavbar;
