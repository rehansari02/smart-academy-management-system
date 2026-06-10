import React, { useState, useEffect, useMemo } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { fetchCourses } from '../../features/master/masterSlice';
import groupInstituteService from '../../services/groupInstituteService';
import {
  Phone, Mail, Facebook, Twitter, Instagram, Linkedin, Youtube,
  LogIn, UserPlus, ArrowRight, Menu, X, MapPin, ChevronDown, BookOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import logoImage from '../../assets/logo2.png';

const PublicNavbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null); // For Mobile
  const [hoverDropdown, setHoverDropdown] = useState(null); // For Desktop
  const [activeCourseType, setActiveCourseType] = useState('');
  const [groupInstitutes, setGroupInstitutes] = useState([]);
  const location = useLocation();
  const dispatch = useDispatch();

  // Fetch courses for dynamic dropdown
  const { courses, isLoading } = useSelector((state) => state.master);
  const { user } = useSelector((state) => state.auth);

  useEffect(() => {
    if (courses.length === 0 && !isLoading) {
      dispatch(fetchCourses());
    }
  }, [dispatch, courses.length, isLoading]);

  useEffect(() => {
    const loadGroupInstitutes = async () => {
      try {
        const data = await groupInstituteService.getPublicItems();
        setGroupInstitutes(Array.isArray(data) ? data : []);
      } catch (error) {
        setGroupInstitutes([]);
      }
    };

    loadGroupInstitutes();
  }, []);

  // Extract unique Course Types and group courses
  const courseGroups = courses.reduce((acc, course) => {
    const type = course.courseType || 'Other';
    if (!acc[type]) acc[type] = [];
    acc[type].push(course);
    return acc;
  }, {});

  const courseTypes = Object.keys(courseGroups);
  const selectedCourseType = courseTypes.includes(activeCourseType) ? activeCourseType : courseTypes[0];
  const selectedCourses = selectedCourseType ? courseGroups[selectedCourseType] || [] : [];

  useEffect(() => {
    if (courseTypes.length > 0 && !courseTypes.includes(activeCourseType)) {
      setActiveCourseType(courseTypes[0]);
    }
  }, [courseTypes, activeCourseType]);

  const menuItems = [
    { name: 'Home', path: '/' },
    {
      name: 'About Us',
      isDropdown: true,
      subItems: [
        { name: 'About Smart', path: '/about-us#smart' },
        { name: 'Mission', path: '/about-us#mission' },
        { name: 'Vision', path: '/about-us#vision' },
        { name: 'Why Smart', path: '/why-smart' },
        { name: 'Facilities', path: '/facilities' },
      ]
    },
    {
      name: 'Course',
      isDropdown: true,
      isMegaMenu: true, // Marker for Mega Menu
    },
    {
      name: 'Student Corner',
      isDropdown: true,
      subItems: [
        { name: 'Student Login', path: '/student-login' },
        { name: 'Admission Verify', path: '/verify-student' },
        { name: 'Result View', path: '/result' },
      ]
    },
    { name: 'Gallery', path: '/gallery' },
    { name: 'Our Team', path: '/our-team' },
    { name: 'Franchise', path: '/franchise' },
    { name: 'Contact', path: '/contact' },
    { name: 'Blog', path: '/blog' },
    {
      name: 'Group Of Institute',
      isDropdown: true,
      subItems: groupInstitutes.map((item) => ({
        name: item.name,
        href: item.link,
        external: true
      }))
    },
    // { name: 'Feedback', path: '/feedback' }
  ];

  // Helper to determine if a path is active
  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path.split('?')[0]);
  };

  const isDropdownActive = (subItems) => {
    if (!subItems) return false;
    return subItems.some(sub => {
      if (!sub.path) return false;
      const cleanPath = sub.path.split('#')[0].split('?')[0];
      return location.pathname === cleanPath || (cleanPath !== '/' && location.pathname.startsWith(cleanPath));
    });
  };

  return (
    <nav className="bg-blue-900 text-white shadow-sm sticky top-0 z-50 font-sans border-b border-blue-800">
      <div className="container mx-auto px-4">
        <div className="flex justify-between md:justify-center items-center h-20 relative">

          {/* Mobile Logo (Visible only on mobile since main logo is in header) */}
          <div className="md:hidden flex-shrink-0 bg-white/95 backdrop-blur-sm p-1.5 rounded-lg shadow-lg shadow-black/10 border border-white/20 transform hover:scale-105 transition-all">
            <img src={logoImage} alt="Logo" className="h-9 w-auto object-contain" />
          </div>

          {/* Mobile Menu Button */}
          <button className="md:hidden p-2 text-white hover:bg-blue-800 rounded-lg transition-colors absolute right-0" onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? <X size={28} /> : <Menu size={28} />}
          </button>

          {/* Desktop Menu - Centered */}
          <div className="hidden md:flex items-center justify-center gap-2.5">
            {menuItems.map((item, index) => (
              <div key={index} className={`${item.isMegaMenu ? 'static' : 'relative'} group`}
                onMouseEnter={() => setHoverDropdown(index)}
                onMouseLeave={() => setHoverDropdown(null)}
              >
                {item.isDropdown ? (
                  <div>
                    <button className={`flex items-center gap-1 whitespace-nowrap rounded-md px-3 py-3 text-[13px] font-bold uppercase tracking-wide leading-none hover:text-yellow-300 transition-colors border-b-2 border-transparent hover:border-yellow-300 ${(item.subItems && isDropdownActive(item.subItems)) || (item.isMegaMenu && location.pathname.includes('/course')) ? 'text-yellow-300 border-yellow-300' : 'text-white'}`}>
                      {item.name} <ChevronDown size={14} className={`transform transition-transform duration-200 ${hoverDropdown === index ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Dropdown Content */}
                    <AnimatePresence>
                      {hoverDropdown === index && (
                        <motion.div
                          initial={{ opacity: 0, y: 15, x: "-50%" }}
                          animate={{ opacity: 1, y: 0, x: "-50%" }}
                          exit={{ opacity: 0, y: 15, x: "-50%" }}
                          transition={{ duration: 0.2 }}
                          className={`absolute left-1/2 ${item.isMegaMenu ? 'top-[80px]' : 'mt-0'} bg-white text-gray-800 shadow-2xl rounded-xl overflow-hidden border border-gray-100 z-50 ${item.isMegaMenu ? 'w-[800px]' : 'w-56'}`}
                          // Note: Mega menu uses absolute positioning relative to the nav container
                          style={item.isMegaMenu ? { width: '900px', maxWidth: '90vw' } : {}}
                        >
                          {item.isMegaMenu ? (
                            <div className="grid min-h-[360px] grid-cols-[290px_1fr] bg-white">
                              <div className="border-r border-gray-100 bg-gray-50 p-3">
                                <Link
                                  to="/course"
                                  className="mb-2 flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-black text-primary hover:bg-white"
                                >
                                  <BookOpen size={16} /> All Courses
                                </Link>
                                {courseTypes.length > 0 ? courseTypes.map((type) => (
                                  <button
                                    key={type}
                                    type="button"
                                    onMouseEnter={() => setActiveCourseType(type)}
                                    onFocus={() => setActiveCourseType(type)}
                                    className={`flex w-full items-center justify-between rounded-lg px-4 py-3 text-left text-sm font-black uppercase tracking-wide transition-colors ${
                                      selectedCourseType === type
                                        ? 'bg-primary text-white shadow-sm'
                                        : 'text-gray-700 hover:bg-white hover:text-primary'
                                    }`}
                                  >
                                    <span className="line-clamp-2">{type}</span>
                                    <ArrowRight size={15} className="shrink-0" />
                                  </button>
                                )) : (
                                  <div className="px-4 py-8 text-center text-sm font-semibold text-gray-400">Loading courses...</div>
                                )}
                              </div>

                              <div className="p-6">
                                {selectedCourseType ? (
                                  <>
                                    <div className="mb-4 border-b border-gray-100 pb-3">
                                      <p className="text-xs font-black uppercase tracking-widest text-gray-400">Courses</p>
                                      <h4 className="mt-1 text-xl font-black text-gray-900">{selectedCourseType}</h4>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                      {selectedCourses.map(course => (
                                        <Link
                                          key={course._id}
                                          to={`/course/${course._id}`}
                                          className="group/card flex flex-col justify-between rounded-lg border border-gray-200 px-4 py-3 hover:border-primary hover:bg-blue-50 hover:shadow-md transition-all cursor-pointer"
                                        >
                                          <span className="text-sm font-semibold text-gray-700 group-hover/card:text-primary transition-colors">{course.name}</span>
                                          <span className="mt-1.5 flex items-center gap-1 text-[11px] font-bold text-primary">
                                            View Details <ArrowRight size={11} />
                                          </span>
                                        </Link>
                                      ))}
                                    </div>
                                  </>
                                ) : (
                                  <div className="flex h-full items-center justify-center text-sm font-semibold text-gray-400">Loading courses...</div>
                                )}
                              </div>
                            </div>
                          ) : (
                            // STANDARD DROPDOWN
                            <div className="py-2">
                              {item.subItems.length > 0 ? item.subItems.map((sub, subIdx) => (
                                sub.external ? (
                                  <a
                                    key={subIdx}
                                    href={sub.href}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="block px-6 py-3 text-sm font-semibold text-gray-600 transition-colors hover:bg-primary hover:text-white"
                                  >
                                    {sub.name}
                                  </a>
                                ) : (
                                  <Link
                                    key={subIdx}
                                    to={sub.path}
                                    className={`block px-6 py-3 text-sm font-semibold transition-colors hover:bg-primary hover:text-white ${location.pathname === sub.path.split('#')[0].split('?')[0] ? 'bg-primary text-white' : 'text-gray-600'}`}
                                  >
                                    {sub.name}
                                  </Link>
                                )
                              )) : (
                                <div className="px-6 py-3 text-sm font-medium text-gray-400">
                                  No institute links added
                                </div>
                              )}
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ) : (
                  <Link to={item.path}
                    className={`flex items-center gap-1 whitespace-nowrap rounded-md px-3 py-3 text-[13px] font-bold uppercase tracking-wide leading-none hover:text-yellow-300 transition-colors border-b-2 border-transparent hover:border-yellow-300 ${isActive(item.path) ? 'text-yellow-300 border-yellow-300' : 'text-white'}`}
                  >
                    {item.name}
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="md:hidden fixed inset-0 z-50 bg-white"
          >
            <div className="p-4 flex justify-between items-center border-b border-gray-100">
              <img src={logoImage} alt="Logo" className="h-10 w-auto" />
              <button onClick={() => setIsOpen(false)} className="p-2 bg-gray-100 rounded-full">
                <X size={24} />
              </button>
            </div>

            <div className="flex flex-col p-4 space-y-2 overflow-y-auto h-[calc(100vh-80px)]">
              {menuItems.map((item, index) => (
                <div key={index}>
                  {item.isDropdown ? (
                    <div>
                      <button
                        onClick={() => setActiveDropdown(activeDropdown === index ? null : index)}
                        className={`w-full flex items-center justify-between px-4 py-4 text-base font-bold border-b border-gray-100 ${(item.subItems && isDropdownActive(item.subItems)) || (item.isMegaMenu && location.pathname.includes('/course')) ? 'text-primary bg-blue-50/50' : 'text-gray-800'}`}
                      >
                        {item.name}
                        <ChevronDown size={16} className={`transition-transform duration-300 ${activeDropdown === index ? 'rotate-180' : ''}`} />
                      </button>
                      <AnimatePresence>
                        {activeDropdown === index && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="bg-gray-50 px-4 py-2"
                          >
                            {item.isMegaMenu ? (
                              <div className="space-y-4 py-2">
                                {courseTypes.map((type, idx) => (
                                  <div key={idx}>
                                    <h5 className="font-bold text-xs uppercase text-gray-500 mb-2">{type}</h5>
                                    <ul className="space-y-2 pl-2 border-l-2 border-primary/20">
                                      {courseGroups[type].map(course => (
                                        <li key={course._id}>
                                          <Link to={`/course/${course._id}`} className="block text-sm text-gray-700 py-1" onClick={() => setIsOpen(false)}>{course.name}</Link>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              item.subItems.length > 0 ? item.subItems.map((sub, subIdx) => (
                                sub.external ? (
                                  <a
                                    key={subIdx}
                                    href={sub.href}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="block rounded-lg border-b border-gray-100 px-3 py-3 text-sm font-medium text-gray-600 transition-colors hover:bg-primary hover:text-white last:border-0"
                                    onClick={() => setIsOpen(false)}
                                  >
                                    {sub.name}
                                  </a>
                                ) : (
                                  <Link
                                    key={subIdx}
                                    to={sub.path}
                                    className={`block rounded-lg border-b border-gray-100 px-3 py-3 text-sm font-medium transition-colors last:border-0 ${location.pathname === sub.path.split('#')[0].split('?')[0] ? 'bg-primary text-white' : 'text-gray-600 hover:bg-primary hover:text-white'}`}
                                    onClick={() => setIsOpen(false)}
                                  >
                                    {sub.name}
                                  </Link>
                                )
                              )) : (
                                <div className="py-3 text-sm font-medium text-gray-400">
                                  No institute links added
                                </div>
                              )
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ) : (
                    <Link
                      to={item.path}
                      className={`block px-4 py-4 text-base font-bold border-b border-gray-100 ${isActive(item.path) ? 'text-primary bg-blue-50/50' : 'text-gray-800'}`}
                      onClick={() => setIsOpen(false)}
                    >
                      {item.name}
                    </Link>
                  )}
                </div>
              ))}

              {user && (
                <div className="pt-6 border-t border-gray-200">
                  <Link to="/home" className="flex items-center justify-center gap-2 bg-accent text-white py-3 rounded-xl font-bold shadow-md hover:shadow-lg transition-all" onClick={() => setIsOpen(false)}>
                    <ArrowRight size={18} /> Go to Dashboard
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

const PublicLayout = () => {
  const { user } = useSelector((state) => state.auth);
  const location = useLocation();

  const whatsappMessage = useMemo(() => {
    const pageMap = [
      { match: ['/online-admission'], message: 'Hello, I want admission details and fee information for Smart Institute.' },
      { match: ['/course'], message: 'Hello, I want course details and timings from Smart Institute.' },
      { match: ['/contact'], message: 'Hello, I need the contact details and office location for Smart Institute.' },
      { match: ['/franchise'], message: 'Hello, I want franchise information for Smart Institute.' },
      { match: ['/verify-student'], message: 'Hello, I need help with student admission verification.' },
      { match: ['/student-login'], message: 'Hello, I need help with student login access.' },
      { match: ['/result'], message: 'Hello, I need help checking student results.' },
      { match: ['/feedback'], message: 'Hello, I want to share feedback about Smart Institute.' }
    ];

    const match = pageMap.find(item => item.match.some(path => location.pathname.startsWith(path)));
    return match?.message || 'Hello, I would like more information about Smart Institute.';
  }, [location.pathname]);

  const whatsappLink = useMemo(() => {
    const phone = '919601749300';
    const text = encodeURIComponent(whatsappMessage);
    return `https://wa.me/${phone}?text=${text}`;
  }, [whatsappMessage]);

  return (
    <div className="min-h-screen bg-white font-sans flex flex-col">
      {/* 1. Slim Top Header */}
      <div className="bg-gray-100 text-black py-2.5 text-xs font-medium tracking-wide">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-3 md:gap-2">
            {/* Contact Info */}
            <div className="flex items-center justify-center w-full md:w-auto gap-6 uppercase tracking-wider text-[11px]">
              <a href="tel:+919601749300" className="flex items-center gap-2 hover:text-accent transition-colors"><Phone size={12} className="text-accent" /> Call Us</a>
              <span className="hidden sm:inline text-gray-400">|</span>
              <a href="mailto:info@smartinstitute.co.in" className="flex items-center gap-2 hover:text-accent transition-colors"><Mail size={12} className="text-accent" /> Email Us</a>
            </div>

            {/* Social & Auth - Desktop */}
            <div className="hidden md:flex items-center gap-6">
              <div className="flex gap-4 pr-6 border-r border-gray-700">
                <a href="https://www.facebook.com/smartinstituteindia" target="_blank" rel="noopener noreferrer" className="hover:text-blue-500 transition-transform hover:-translate-y-0.5"><Facebook size={14} /></a>
                <a href="https://www.instagram.com/smartinstitutesurat/" target='_blank' rel='noopener noreferrer' className="hover:text-pink-500 transition-transform hover:-translate-y-0.5"><Instagram size={14} /></a>
                <a href="https://www.youtube.com/channel/UCFfLzGu6VS4gOTZkJRtmfkg" target="_blank" rel="noopener noreferrer" className="hover:text-red-500 transition-transform hover:-translate-y-0.5"><Youtube size={14} /></a>
              </div>

              <div className="text-[11px] font-bold uppercase tracking-widest flex items-center gap-4">
                <Link to="/contact" className="hover:text-accent transition-colors">Support</Link>
                <span className="text-gray-600">/</span>
                {user ? (
                  <Link to="/home" className="flex items-center gap-2 text-accent hover:text-white transition-colors">
                    DASHBOARD <ArrowRight size={12} />
                  </Link>
                ) : (
                  <Link to="/login" className="hover:text-accent transition-colors flex items-center gap-1">
                    <LogIn size={12} /> Login
                  </Link>
                )}
              </div>
            </div>

            {/* Social & Auth - Mobile */}
            <div className="md:hidden flex flex-col items-center gap-3 w-full border-t border-gray-200 pt-3">
              {/* Social Media Icons */}
              <div className="flex items-center gap-5">
                <a href="https://www.facebook.com/smartinstituteindia" target="_blank" rel="noopener noreferrer" className="p-2 bg-white rounded-full shadow-sm hover:shadow-md hover:bg-blue-500 hover:text-white transition-all transform hover:scale-110">
                  <Facebook size={16} />
                </a>
                <a href="https://www.instagram.com/smartinstitutesurat/" target='_blank' rel='noopener noreferrer' className="p-2 bg-white rounded-full shadow-sm hover:shadow-md hover:bg-pink-500 hover:text-white transition-all transform hover:scale-110">
                  <Instagram size={16} />
                </a>
                <a href="https://www.youtube.com/channel/UCFfLzGu6VS4gOTZkJRtmfkg" target="_blank" rel="noopener noreferrer" className="p-2 bg-white rounded-full shadow-sm hover:shadow-md hover:bg-red-500 hover:text-white transition-all transform hover:scale-110">
                  <Youtube size={16} />
                </a>
              </div>

              {/* Login Portal Button */}
              <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-widest">
                {user ? (
                  <Link to="/home" className="flex items-center gap-2 bg-accent text-white px-4 py-2 rounded-lg shadow-sm hover:shadow-md transition-all">
                    <ArrowRight size={14} /> Dashboard
                  </Link>
                ) : (
                  <Link to="/login" className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg shadow-sm hover:shadow-md transition-all">
                    <LogIn size={14} /> Login Portal
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Logo & Branding Area */}
      <div className="bg-white py-2">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Logo */}
            <div className="flex-shrink-0 hidden md:block">
              <Link to="/">
                <img src={logoImage} alt="Smart Institute Logo" className="h-20 md:h-24 w-auto object-contain" />
              </Link>
            </div>

            {/* Slogan */}
            <div className="flex-grow flex flex-col items-center justify-center text-center space-y-1">
              <h3 className="text-2xl md:text-4xl font-black text-gray-900 tracking-tight">
                <span className="text-gray-800">सपने जो</span> <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-600 font-extrabold mx-1 font-sans">SMART</span> <span className="text-gray-800">बना दे</span>
              </h3>
            </div>

            {/* Right Side Visual/CTA (Optional) */}
            <div className="hidden md:flex items-center gap-3">
              <Link to="/online-admission" className="bg-primary text-white px-6 py-3.5 rounded-xl font-bold uppercase tracking-wider shadow-lg hover:shadow-primary/30 hover:-translate-y-1 transition-all flex items-center gap-2 text-sm animate-pulse-subtle">
                <UserPlus size={18} /> Enroll Now
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Public Navbar (Centered & Light Theme) */}
      <PublicNavbar />

      {/* 4. Main Page Content */}
      <div className="flex-grow">
        <Outlet />
      </div>

      <a
        href={whatsappLink}
        target="_blank"
        rel="noreferrer"
        className="fixed bottom-5 right-5 z-[60] flex items-center justify-center rounded-full bg-[#25D366] p-3 text-white shadow-lg shadow-green-900/20 animate-whatsapp-pulse"
        aria-label="Chat on WhatsApp"
        title="Chat on WhatsApp"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-7 w-7"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"
          />
        </svg>
      </a>

      {/* 5. Footer */}
      <footer className="bg-gray-900 text-gray-300 pt-16 pb-8 border-t-4 border-accent mt-auto">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-6">
                <img src={logoImage} alt="Smart Institute Logo" className="h-10 w-auto object-contain bg-white rounded-lg p-1" />
              </div>
              <p className="text-sm text-gray-400 leading-relaxed mb-6">
                Disclaimer Smart Institute © {new Date().getFullYear()} Developed by Smart Institute Team All Logos / Characters are the Property of their Respective Organisation.
              </p>
              <div className="flex gap-4">
                <a href="https://www.facebook.com/smartinstituteindia" target="_blank" rel="noopener noreferrer" className="p-2 bg-gray-800 rounded-lg hover:bg-primary transition-colors"><Facebook size={18} /></a>
                <a href="#" className="p-2 bg-gray-800 rounded-lg hover:bg-sky-400 transition-colors flex items-center justify-center font-bold text-white w-[34px] h-[34px]">X</a>
                <a href="#" className="p-2 bg-gray-800 rounded-lg hover:bg-pink-500 transition-colors"><Instagram size={18} /></a>
                <a href="https://www.youtube.com/channel/UCFfLzGu6VS4gOTZkJRtmfkg" target="_blank" rel="noopener noreferrer" className="p-2 bg-gray-800 rounded-lg hover:bg-red-600 transition-colors"><Youtube size={18} /></a>
              </div>
            </div>

            <div>
              <h3 className="text-white font-bold text-lg mb-6 border-l-4 border-accent pl-3">Navigation</h3>
              <ul className="space-y-3 text-sm">
                <li><Link to="/" className="hover:text-accent transition-colors">Home</Link></li>
                <li><Link to="/about-us" className="hover:text-accent transition-colors">About Us</Link></li>
                <li><Link to="/course" className="hover:text-accent transition-colors">Courses</Link></li>
                <li><Link to="/gallery" className="hover:text-accent transition-colors">Gallery</Link></li>
                <li><Link to="/contact" className="hover:text-accent transition-colors">Contact</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="text-white font-bold text-lg mb-6 border-l-4 border-accent pl-3">Why SMART?</h3>
              <ul className="space-y-3 text-sm">
                <li><a href="#" className="hover:text-accent transition-colors">Expert Faculty</a></li>
                <li><a href="#" className="hover:text-accent transition-colors">Digital Classrooms</a></li>
                <li><a href="#" className="hover:text-accent transition-colors">100% Placement</a></li>
                <li><a href="#" className="hover:text-accent transition-colors">Practical Learning</a></li>
              </ul>
            </div>

            <div>
              <h3 className="text-white font-bold text-lg mb-6 border-l-4 border-accent pl-3">Contact Us</h3>
              <ul className="space-y-4 text-sm">
                <li className="flex items-start gap-3">
                  <MapPin size={20} className="text-accent shrink-0" />
                  <span>1st & 2nd Floor, 50-kubernagar, Opp. Baba Baijnath Mandir, Nilgiri Road, Ass-Pass Circle, Godadra Surat - 395010</span>
                </li>
                <li className="flex items-center gap-3">
                  <Phone size={18} className="text-accent shrink-0" />
                  <a href="tel:+919601749300" className="hover:text-accent transition-colors">+91-96017-49300</a>
                </li>
                <li className="flex items-center gap-3">
                  <Mail size={18} className="text-accent shrink-0" />
                  <a href="mailto:info@smartinstitute.co.in" className="hover:text-accent transition-colors">info@smartinstitute.co.in</a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 text-center text-sm text-gray-500">
            Copyright © 2013 - {new Date().getFullYear()} Smart Institute. All Rights Reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PublicLayout;
