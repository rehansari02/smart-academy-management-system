import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
    fetchCourses,
    fetchPublicPopularCourses,
    fetchPopularCategories
} from "../features/master/masterSlice";
import { getPublicBranches } from '../features/master/branchSlice';
import { createPublicInquiry } from '../features/transaction/transactionSlice';
import { toast } from 'react-toastify';
import { Link, useNavigate } from 'react-router-dom';
import newsService from '../services/newsService';
import topperService from '../services/topperService';
import bannerService from '../services/bannerService';
import homeSectionService from '../services/homeSectionService';
import homeStatsService from '../services/homeStatsService';
import { ArrowRight, X, Trophy, Calendar, ChevronLeft, ChevronRight, Phone, Mail, MapPin, AlertCircle, Quote, Users, ChevronDown, ExternalLink, GraduationCap, Sparkles, Award, Briefcase, Play, BookOpen, ShieldCheck, Handshake } from 'lucide-react';
import { formatDate } from '../utils/dateUtils';
import HeroImage1 from '../assets/6.jpg'
import HeroImage2 from '../assets/studentWithbooks.webp';
import Reveal from '../components/Reveal';
import FeedbackSection from '../components/ui/FeedbackSection';

// Keep existing generic Carousel for Toppers/Reviews
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Autoplay, EffectFade } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/effect-fade';
import { getMediaUrl } from '../utils/mediaUrl';

const Carousel = ({ items }) => {
  return (
    <div className="relative group px-2 md:px-8">
      <style>
        {`
          .swiper-button-disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }
        `}
      </style>
      <Swiper
        modules={[Navigation, Autoplay]}
        spaceBetween={12}
        slidesPerView={1}
        loop={items.length > 3}
        autoplay={{
          delay: 3000,
          disableOnInteraction: false,
          pauseOnMouseEnter: true
        }}
        navigation={{
           nextEl: '.swiper-button-next-custom',
           prevEl: '.swiper-button-prev-custom',
        }}
        breakpoints={{
          640: {
            slidesPerView: 1,
            spaceBetween: 20,
          },
          768: {
            slidesPerView: 3,
            spaceBetween: 12,
          },
          1024: {
            slidesPerView: 3,
            spaceBetween: 12,
          },
        }}
        className="!pb-12 !pt-4 !px-2"
      >
        {items.map((item, index) => (
          <SwiperSlide key={index} className="h-auto flex items-stretch justify-center">
               <div className="flex justify-center items-center w-full">
                 <div className="bg-white p-3 rounded-xl shadow-lg w-full text-center border-t-4 border-accent relative transform hover:scale-105 transition-transform duration-300">
                    <div className="absolute top-4 right-6 text-yellow-400 opacity-20"><Quote size={40} /></div>
                    <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-3 rounded-full overflow-hidden border-4 border-gray-50 shadow-inner">
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-gray-800 mb-1">{item.name}</h3>
                    <p className="text-primary font-medium text-sm mb-3 uppercase tracking-wide">{item.course}</p>
                    <div className="bg-blue-50 py-2 rounded-lg">
                         <div className="text-3xl font-black text-accent">{item.percentage}%</div>
                         <div className="text-[10px] text-gray-500 font-semibold uppercase">Score Achieved</div>
                    </div>
                 </div>
               </div>
          </SwiperSlide>
        ))}
      </Swiper>
      
      {/* Custom Navigation Buttons */}
      <button className="swiper-button-prev-custom absolute left-0 top-1/2 -translate-y-1/2 bg-white/90 text-gray-800 p-3 rounded-full shadow-lg hover:bg-accent hover:text-white transition-all z-20 cursor-pointer border border-gray-100 hidden md:block group-hover:block">
        <ChevronLeft size={24} />
      </button>
      <button className="swiper-button-next-custom absolute right-0 top-1/2 -translate-y-1/2 bg-white/90 text-gray-800 p-3 rounded-full shadow-lg hover:bg-accent hover:text-white transition-all z-20 cursor-pointer border border-gray-100 hidden md:block group-hover:block">
        <ChevronRight size={24} />
      </button>
    </div>
  );
};

const HeroBannerVisual = ({ items, mobile = false }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const swiperRef = useRef(null);

  const slides = items && items.length > 0
    ? items
    : [{ image: HeroImage2, title: 'Smart Institute students' }];
  const shouldLoop = slides.length > 1;

  return (
    <div className="hero-banner-shine relative h-full w-full overflow-hidden">
      <Swiper
        onSwiper={(swiper) => { swiperRef.current = swiper; }}
        onSlideChange={(swiper) => setActiveIndex(swiper.realIndex)}
        modules={[Autoplay, EffectFade]}
        effect="fade"
        fadeEffect={{ crossFade: true }}
        slidesPerView={1}
        loop={shouldLoop}
        speed={1000}
        autoplay={shouldLoop ? {
          delay: 3500,
          disableOnInteraction: false,
          pauseOnMouseEnter: false
        } : false}
        className="hero-banner-swiper h-full w-full"
      >
        {slides.map((item, index) => (
          <SwiperSlide key={item._id || `${item.image}-${index}`} className="h-full w-full">
            <img
              src={getMediaUrl(item.image) || HeroImage2}
              alt={item.title || 'Smart Institute banner'}
              className={`hero-banner-image h-full w-full ${mobile ? 'object-contain bg-[#0a1931]' : 'object-cover'} object-center`}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a1931]/30 via-transparent to-white/10" />
          </SwiperSlide>
        ))}
      </Swiper>

      {shouldLoop && (
        <div className={`${mobile ? 'bottom-5 left-1/2 -translate-x-1/2' : 'bottom-6 right-8'} absolute z-20 flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20 shadow-lg`}>
          {slides.map((item, index) => (
            <button
              key={item._id || index}
              onClick={() => swiperRef.current?.slideToLoop(index)}
              className={`h-2 rounded-full transition-all duration-500 cursor-pointer ${
                activeIndex === index
                  ? 'w-7 bg-[#f15a24] shadow-md shadow-[#f15a24]/60'
                  : 'w-2 bg-white/50 hover:bg-white'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const formatStatNumber = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return '0';
  if (number >= 1000000) {
    return `${(number / 1000000).toFixed(number >= 10000000 ? 0 : 1).replace(/\.0$/, '')}M`;
  }
  if (number >= 1000) {
    return `${(number / 1000).toFixed(number >= 10000 ? 0 : 1).replace(/\.0$/, '')}K`;
  }
  return new Intl.NumberFormat('en-IN').format(number);
};

const HomePage = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { courses, popularCourses, popularCategories } = useSelector((state) => state.master);
    const { branches } = useSelector((state) => state.branch);
    const [captcha, setCaptcha] = useState('');
    const [userCaptcha, setUserCaptcha] = useState('');
    const [formLoading, setFormLoading] = useState(false);
    const [latestNews, setLatestNews] = useState([]); 
    const [newsLoading, setNewsLoading] = useState(true);
    const [selectedNews, setSelectedNews] = useState(null);
    const [toppers, setToppers] = useState([]);
    const [toppersLoading, setToppersLoading] = useState(true);
    const defaultHeroImages = [];
    const [heroImages, setHeroImages] = useState(defaultHeroImages);
    const [homeStats, setHomeStats] = useState({
      studentsTrained: 0,
      expertFaculty: 0,
      coursesOffered: 0,
      successRate: 95,
      recruitmentPartners: 100
    });
    const [homeSections, setHomeSections] = useState({});
    const [selectedCategory, setSelectedCategory] = useState('all');
  
    const [formData, setFormData] = useState({
      name: '',
      email: '',
      phone: '',
      state: '',
      city: '',
      course: '',
      branchId: '',
      message: ''
    });
  
    const generateCaptcha = () => {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let result = '';
      for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      setCaptcha(result);
    };
  
    useEffect(() => {
      dispatch(fetchCourses());
      dispatch(getPublicBranches());
      dispatch(fetchPublicPopularCourses());
      dispatch(fetchPopularCategories());
      generateCaptcha();
      fetchLatestNews();
      fetchToppers();
      fetchBanners();
      fetchHomeSections();
      fetchHomeStats();
    }, [dispatch]);

    const fetchHomeStats = async () => {
        try {
            const data = await homeStatsService.getPublicHomeStats();
            setHomeStats((prev) => ({ ...prev, ...data }));
        } catch (error) {
            console.error("Failed to load home stats", error);
        }
    };

    const fetchHomeSections = async () => {
        try {
            const data = await homeSectionService.getPublicSections();
            const map = {};
            data.forEach(s => { map[s.sectionKey] = s; });
            setHomeSections(map);
        } catch (error) {
            console.error('Failed to load home sections', error);
        }
    };

    const fetchBanners = async () => {
        try {
            const data = await bannerService.getPublicBanners();
            if (data && data.length > 0) {
                setHeroImages([...defaultHeroImages, ...data]);
            }
        } catch (error) {
            console.error("Failed to load banners", error);
        }
    };

    const fetchToppers = async () => {
        try {
            const data = await topperService.getPublicToppers();
            setToppers(data);
        } catch (error) {
            console.error("Failed to load toppers", error);
        } finally {
            setToppersLoading(false);
        }
    };

    const fetchLatestNews = async () => {
        try {
            const data = await newsService.getPublicNews();
            // Sort by release date descending
            const sortedData = [...data].sort((a,b) => new Date(b.releaseDate) - new Date(a.releaseDate));
            setLatestNews(sortedData);
        } catch (error) {
            console.error("Failed to load news", error);
        } finally {
            setNewsLoading(false);
        }
    };
  
    const handleChange = (e) => {
      setFormData({ ...formData, [e.target.name]: e.target.value });
    };
  
    const handleSubmit = async (e) => {
      e.preventDefault();
      
      if (userCaptcha !== captcha) {
        toast.error('Invalid Security Code!');
        return;
      }
  
      if (!formData.name || !formData.phone || !formData.state || !formData.city || !formData.course || !formData.branchId) {
        toast.error('Please fill all required fields (*)!');
        return;
      }
  
      setFormLoading(true);
      try {
        const payload = {
          firstName: formData.name,
          contactStudent: formData.phone,
          email: formData.email,
          state: formData.state,
          city: formData.city,
          interestedCourse: formData.course,
          branchId: formData.branchId,
          remarks: formData.message,
          source: 'QuickContact',
          status: 'Pending'
        };
        
        await dispatch(createPublicInquiry(payload)).unwrap();
        
        toast.success("Inquiry Submitted Successfully! We'll contact you soon.");
        setFormData({
          name: '',
          email: '',
          phone: '',
          state: '',
          city: '',
          course: '',
          branchId: '',
          message: ''
        });
        setUserCaptcha('');
        generateCaptcha();
  
      } catch (error) {
        toast.error(error.message || 'Failed to submit inquiry');
      } finally {
        setFormLoading(false);
      }
    };
  
    return (
      <div className="w-full">
        {/* 1. Custom Hero Section matching Screenshot */}
        <div className="relative bg-white pt-8 pb-16 overflow-hidden min-h-[580px] lg:h-[640px] flex items-center">

          {/* Right image elements (absolute relative to viewport edge) */}
          <div className="absolute right-0 top-0 bottom-0 w-[55%] hidden md:block overflow-hidden z-0">
            {/* Blue background decoration (rounded left, full height) */}
            <div className="absolute right-0 top-0 bottom-0 w-[360px] lg:w-[500px] bg-[#0a1931] rounded-l-full shadow-2xl z-0"></div>

            {/* Dotted pattern */}
            <div className="absolute bottom-[15%] right-[460px] lg:right-[620px] w-20 h-20 opacity-15 bg-[radial-gradient(#f15a24_2px,transparent_2px)] [background-size:12px_12px] z-10"></div>

            {/* Orange stroke curved line (parallel to white border) */}
            <div className="absolute right-0 top-0 bottom-0 w-[410px] lg:w-[570px] rounded-l-full border-l-2 border-[#f15a24] z-10 pointer-events-none"></div>

            {/* Banner image container (curved left, white border on left, full height of hero section) */}
            <div className="absolute right-0 top-0 bottom-0 w-[400px] lg:w-[560px] rounded-l-full overflow-hidden border-l-[8px] border-white shadow-xl bg-slate-50 z-10 flex items-center justify-center">
              <HeroBannerVisual items={heroImages} />
            </div>
          </div>

          <div className="container mx-auto px-4 lg:px-8 z-10 relative">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">

              {/* Left text column */}
              <div className="lg:col-span-7 space-y-8 text-left z-10">
                <div className="inline-flex flex-wrap items-center gap-1.5 text-[13px] font-extrabold tracking-widest uppercase">
                  <span className="text-[#0a1931]">
                    {homeSections.hero_text?.subtitle || 'LEARN. PRACTICE.'}
                  </span>
                  <span className="text-[#f15a24]">
                    {homeSections.hero_text?.subtitle ? '' : 'MASTER.'}
                  </span>
                </div>

                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1] text-[#0a1931]">
                  {homeSections.hero_text?.title || 'Empowering Minds.'} <br />
                  <span className="text-blue-900">
                    {homeSections.hero_text?.quote || 'Building Futures.'}
                  </span>
                </h1>

                <p className="text-slate-600 text-base sm:text-lg max-w-xl leading-relaxed font-normal">
                  {homeSections.hero_text?.description || 'Industry-focused training designed to build your skills, boost confidence and create better career opportunities.'}
                </p>

                {/* Key Features row/grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-4 pb-6 border-b border-gray-100">
                  <div className="flex flex-col items-start space-y-2">
                    <div className="p-3 bg-blue-50 text-primary rounded-2xl">
                      <GraduationCap size={24} className="text-[#1e3a8a]" />
                    </div>
                    <span className="text-sm font-extrabold text-slate-800 tracking-tight leading-tight">Expert Faculty</span>
                  </div>

                  <div className="flex flex-col items-start space-y-2">
                    <div className="p-3 bg-orange-50 text-[#f15a24] rounded-2xl">
                      <Sparkles size={24} className="text-[#f15a24]" />
                    </div>
                    <span className="text-sm font-extrabold text-slate-800 tracking-tight leading-tight">Practical Learning</span>
                  </div>

                  <div className="flex flex-col items-start space-y-2">
                    <div className="p-3 bg-blue-50 text-primary rounded-2xl">
                      <Award size={24} className="text-[#1e3a8a]" />
                    </div>
                    <span className="text-sm font-extrabold text-slate-800 tracking-tight leading-tight">Certification</span>
                  </div>

                  <div className="flex flex-col items-start space-y-2">
                    <div className="p-3 bg-orange-50 text-[#f15a24] rounded-2xl">
                      <Briefcase size={24} className="text-[#f15a24]" />
                    </div>
                    <span className="text-sm font-extrabold text-slate-800 tracking-tight leading-tight">Placement Support</span>
                  </div>
                </div>

                {/* CTA Buttons */}
                <div className="flex flex-wrap items-center gap-4 sm:gap-6 pt-2">
                  <button
                    onClick={() => {
                      const target = document.getElementById('courses-section');
                      if (target) {
                        target.scrollIntoView({ behavior: 'smooth' });
                      } else {
                        navigate('/course');
                      }
                    }}
                    className="inline-flex items-center gap-3 bg-[#0a1931] hover:bg-[#1e3a8a] text-white px-8 py-4 rounded-xl font-bold uppercase tracking-wider transition-all duration-300 hover:shadow-lg shadow-black/25 transform hover:-translate-y-0.5 text-sm"
                  >
                    {homeSections.hero_text?.buttonLabel || 'Explore Courses'} <ArrowRight size={16} />
                  </button>

                  {/* <button
                    onClick={() => setIsVideoModalOpen(true)}
                    className="inline-flex items-center gap-3 text-[#0a1931] hover:text-[#f15a24] px-4 py-3 font-bold uppercase tracking-wider transition-colors duration-300 group text-sm"
                  >
                    <div className="p-3 bg-[#0a1931]/5 group-hover:bg-[#f15a24]/10 rounded-full border border-gray-200 transition-colors flex items-center justify-center">
                      <Play size={16} fill="currentColor" className="text-[#0a1931] group-hover:text-[#f15a24] translate-x-0.5" />
                    </div>
                    Watch Video
                  </button> */}
                </div>
              </div>

              {/* Right column: Spacer on desktop/tablet, centered square card on mobile */}
              <div className="lg:col-span-5 md:col-span-5 h-auto md:h-auto relative flex items-center justify-center">
                {/* On mobile, show square card */}
                <div className="md:hidden relative w-full flex items-center justify-center py-4 px-2">
                  {/* Dotted pattern accent */}
                  <div className="absolute -bottom-2 -right-2 w-24 h-24 opacity-20 bg-[radial-gradient(#f15a24_2px,transparent_2px)] [background-size:12px_12px]"></div>

                  {/* Banner Card Container (16:10 ratio for full image visibility) */}
                  <div className="w-full max-w-[360px] sm:max-w-[480px] aspect-[16/10] rounded-2xl sm:rounded-3xl overflow-hidden border-4 sm:border-8 border-white shadow-2xl bg-[#0a1931] relative z-10">
                    <HeroBannerVisual items={heroImages} mobile />
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* Stats Section overlapping */}
        <div className="relative z-20 w-full mt-[-2rem] mb-12">
          <div className="container mx-auto px-4 lg:px-8">
            <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-[0_25px_60px_rgba(10,25,49,0.12)] border border-slate-100 p-4 sm:p-6 md:p-8">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 md:gap-5 items-stretch">

                {/* 1. Students Trained */}
                <div className="flex items-center gap-3 sm:gap-4 p-3.5 sm:p-4 rounded-2xl bg-white shadow-[0_6px_20px_rgba(0,0,0,0.05)] border border-slate-100 hover:shadow-[0_12px_28px_rgba(10,25,49,0.12)] hover:-translate-y-1 transition-all duration-300 justify-start">
                  <div className="p-3 bg-blue-50/90 rounded-2xl shrink-0 shadow-sm">
                    <GraduationCap size={28} className="text-[#0a1931]" />
                  </div>
                  <div>
                    <div className="text-2xl sm:text-3xl font-black text-[#0a1931]">{formatStatNumber(homeStats.studentsTrained)}+</div>
                    <div className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Students Trained</div>
                  </div>
                </div>

                {/* 2. Expert Faculty */}
                <div className="flex items-center gap-3 sm:gap-4 p-3.5 sm:p-4 rounded-2xl bg-white shadow-[0_6px_20px_rgba(0,0,0,0.05)] border border-slate-100 hover:shadow-[0_12px_28px_rgba(10,25,49,0.12)] hover:-translate-y-1 transition-all duration-300 justify-start">
                  <div className="p-3 bg-blue-50/90 rounded-2xl shrink-0 shadow-sm">
                    <Users size={28} className="text-[#0a1931]" />
                  </div>
                  <div>
                    <div className="text-2xl sm:text-3xl font-black text-[#0a1931]">{formatStatNumber(homeStats.expertFaculty)}+</div>
                    <div className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Expert Faculty</div>
                  </div>
                </div>

                {/* 3. Courses Offered */}
                <div className="flex items-center gap-3 sm:gap-4 p-3.5 sm:p-4 rounded-2xl bg-white shadow-[0_6px_20px_rgba(0,0,0,0.05)] border border-slate-100 hover:shadow-[0_12px_28px_rgba(10,25,49,0.12)] hover:-translate-y-1 transition-all duration-300 justify-start">
                  <div className="p-3 bg-blue-50/90 rounded-2xl shrink-0 shadow-sm">
                    <BookOpen size={28} className="text-[#0a1931]" />
                  </div>
                  <div>
                    <div className="text-2xl sm:text-3xl font-black text-[#0a1931]">{formatStatNumber(homeStats.coursesOffered)}+</div>
                    <div className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Courses Offered</div>
                  </div>
                </div>

                {/* 4. Success Rate */}
                <div className="flex items-center gap-3 sm:gap-4 p-3.5 sm:p-4 rounded-2xl bg-white shadow-[0_6px_20px_rgba(0,0,0,0.05)] border border-slate-100 hover:shadow-[0_12px_28px_rgba(10,25,49,0.12)] hover:-translate-y-1 transition-all duration-300 justify-start">
                  <div className="p-3 bg-blue-50/90 rounded-2xl shrink-0 shadow-sm">
                    <ShieldCheck size={28} className="text-[#0a1931]" />
                  </div>
                  <div>
                    <div className="text-2xl sm:text-3xl font-black text-[#0a1931]">{formatStatNumber(homeStats.successRate)}%</div>
                    <div className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Success Rate</div>
                  </div>
                </div>

                {/* 5. Recruitment Partners */}
                <div className="flex items-center gap-3 sm:gap-4 p-3.5 sm:p-4 rounded-2xl bg-white shadow-[0_6px_20px_rgba(0,0,0,0.05)] border border-slate-100 hover:shadow-[0_12px_28px_rgba(10,25,49,0.12)] hover:-translate-y-1 transition-all duration-300 justify-start col-span-2 md:col-span-1">
                  <div className="p-3 bg-blue-50/90 rounded-2xl shrink-0 shadow-sm">
                    <Handshake size={28} className="text-[#0a1931]" />
                  </div>
                  <div>
                    <div className="text-2xl sm:text-3xl font-black text-[#0a1931]">{formatStatNumber(homeStats.recruitmentPartners)}+</div>
                    <div className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Recruitment Partners</div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>

        {/* 2. Popular & Category Courses */}
        <div className="py-20 bg-white">
          <div className="container mx-auto px-4">
            <Reveal>
              <div className="text-center mb-12">
                <h4 className="text-accent font-bold uppercase tracking-widest text-sm mb-3">Our Offerings</h4>
                <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-4">Popular <span className="text-primary">Courses</span></h2>
                <p className="text-gray-500 text-lg max-w-2xl mx-auto">Choose from our wide range of professional courses designed to boost your career.</p>
              </div>
            </Reveal>

            {/* Category Filter */}
            <Reveal delay={0.2}>
              <div className="flex flex-wrap justify-center gap-3 mb-12">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`px-6 py-2 rounded-full font-medium text-sm transition-all ${
                    selectedCategory === 'all' 
                      ? 'bg-primary text-white shadow-lg shadow-primary/30' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Popular Courses
                </button>
                {popularCategories.filter(cat => cat.isActive).map((cat, i) => (
                  <button
                    key={cat._id || i}
                    onClick={() => setSelectedCategory(cat._id)}
                    className={`px-6 py-2 rounded-full font-medium text-sm transition-all ${
                      selectedCategory === cat._id 
                        ? 'bg-primary text-white shadow-lg shadow-primary/30' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </Reveal>

            {/* Courses Grid */}
            <Reveal delay={0.4}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {(selectedCategory === 'all'
                  ? popularCourses
                  : popularCourses.filter(c => (c.category?._id || c.category) === selectedCategory)
                ).map((popularCourse, index) => {
                    const course = popularCourse.course;
                    if (!course) return null;
                    return (
                      <div key={popularCourse._id || index} className="bg-white rounded-2xl shadow-[0_18px_45px_rgba(15,23,42,0.16)] hover:shadow-[0_24px_60px_rgba(37,99,235,0.22)] overflow-hidden border border-gray-200 ring-1 ring-gray-100 transform hover:-translate-y-2 transition-all duration-300 group">
                        <div className="relative h-48 overflow-hidden">
                          <img 
                            src={course.image || 'https://placehold.co/600x400/e5e7eb/374151?text=Course+Image'} 
                            alt={course.name} 
                            className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700"
                          />
                          {/* <div className="absolute top-4 left-4 bg-accent text-white px-3 py-1 rounded-full text-xs font-bold uppercase shadow-md">
                            Popular
                          </div> */}
                        </div>
                        <div className="p-6">
                          <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">{popularCourse.category?.name || 'Popular'}</div>
                          <h3 className="text-lg font-black text-gray-900 mb-2 leading-tight">{course.name}</h3>
                          {course.smallDescription && (
                            <p className="text-sm text-gray-500 mb-4 line-clamp-2">{course.smallDescription}</p>
                          )}
                          <div className="flex items-center justify-between border-t pt-4 mt-2">
                            <div>
                              <div className="text-xs text-gray-400 uppercase font-semibold">Duration</div>
                              <div className="text-lg font-bold text-gray-800">{course.duration} {course.durationType}</div>
                            </div>
                            <button
                              onClick={() => navigate(`/course/${course._id}`)}
                              className="bg-gradient-to-r from-primary to-blue-700 text-white px-5 py-2 rounded-xl font-bold text-sm hover:shadow-lg hover:shadow-primary/30 transition-all"
                            >
                              Enroll Now
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                })}
              </div>
            </Reveal>
          </div>
        </div>

        {/* 1.b Wide Hero Images Section - Zigzag Layout */}
        <div className="w-full bg-slate-50 py-16 space-y-16">
            
            {/* Row 1: Image Left, Text Right */}
            {(!homeSections.md_message || homeSections.md_message?.isActive) && (
            <div className="container mx-auto px-4">
              <Reveal>
                <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
                     <div className="w-full lg:w-1/2">
                        <div className="relative group overflow-hidden rounded-2xl shadow-2xl border-4 border-white">
                            <img 
                                src={homeSections.md_message?.image || HeroImage2} 
                                alt="Student Campus Life" 
                                className="w-full h-auto object-cover transform group-hover:scale-105 transition-transform duration-700" 
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        </div>
                     </div>
                     <div className="w-full lg:w-1/2 space-y-6">
                        <div className="inline-block px-4 py-2 bg-primary/10 rounded-full text-primary font-bold text-sm uppercase tracking-wider">
                            {homeSections.md_message?.title || 'Message For All Of You By Smart Group'}
                        </div>
                        <h2 className="text-3xl md:text-4xl font-black text-gray-900 leading-tight">
                            {homeSections.md_message?.subtitle || '"Do The Time Safe, Money Safe Automatically Life Safe"'}
                        </h2>
                        <p className="text-gray-600 text-lg leading-relaxed font-rozha text-xl">
                            {homeSections.md_message?.quote || '" बच्चो की तकनिकी शिक्षा ही आने वाले भारत का भविष्य है "'}
                        </p>
                        <div className="pt-4">
                            <button className="px-8 py-3 bg-white border-2 border-gray-900 text-gray-900 font-bold rounded-xl hover:bg-gray-900 hover:text-white transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1">
                                {homeSections.md_message?.buttonLabel || 'Managing Director'}
                            </button>
                        </div>
                     </div>
                </div>
              </Reveal>
            </div>
            )}

            {/* Row 2: Text Left, Image Right (on Desktop) */}
            {(!homeSections.heritage || homeSections.heritage?.isActive) && (
            <div className="container mx-auto px-4">
              <Reveal>
                <div className="flex flex-col-reverse lg:flex-row items-center gap-8 lg:gap-12">
                     <div className="w-full lg:w-1/2 space-y-6">
                        <div className="inline-block px-4 py-2 bg-accent/10 rounded-full text-accent font-bold text-sm uppercase tracking-wider">
                            {homeSections.heritage?.subtitle || 'Our Heritage'}
                        </div>
                        <h2 className="text-3xl md:text-4xl font-black text-gray-900 leading-tight">
                            {homeSections.heritage?.title || 'Building Leaders'} <br/>
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-500">{homeSections.heritage?.quote || 'Since 18+ Years'}</span>
                        </h2>
                        <p className="text-gray-600 text-lg leading-relaxed">
                            {homeSections.heritage?.description || 'With over a decade of excellence in education, we have shaped the careers of thousands of students.'}
                        </p>
                     </div>
                     <div className="w-full lg:w-1/2">
                         <div className="relative group overflow-hidden rounded-2xl shadow-2xl border-4 border-white">
                            <img 
                                src={homeSections.heritage?.image || HeroImage1} 
                                alt="Institute Building" 
                                className="w-full h-auto object-cover transform group-hover:scale-105 transition-transform duration-700" 
                            />
                             <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        </div>
                     </div>
                </div>
              </Reveal>
            </div>
            )}

        </div>
  
        {/* 3. Quick Contact (Inquiry Form) */}
        <div className="bg-slate-50 py-20 relative overflow-hidden">
             {/* Decorative Elements */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-100/40 rounded-full blur-[100px] translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-orange-100/40 rounded-full blur-[80px] -translate-x-1/2 translate-y-1/3 pointer-events-none"></div>

          <div className="container mx-auto px-4 relative z-10">
            <Reveal>
            <div className="max-w-6xl mx-auto bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col lg:flex-row border border-gray-100">
              {/* Left Info Panel */}
              <div className="lg:w-2/5 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-12 text-white flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5"></div>
                <div className="relative z-10">
                  <h3 className="text-3xl md:text-4xl font-black mb-6">Get In Touch</h3>
                  <p className="text-gray-300 text-lg mb-10 leading-relaxed font-light">
                    Have questions about our courses or admissions? Fill out the form and our career counselors will assist you.
                  </p>
                  
                  <div className="space-y-8">
                     <div className="flex items-start gap-4 group">
                        <div className="p-3 bg-white/10 rounded-xl group-hover:bg-accent group-hover:text-white transition-all backdrop-blur-sm shrink-0">
                          <Phone size={24} />
                        </div> 
                        <div>
                            <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold mb-1">Call Us</p>
                            <p className="font-bold text-lg">+91-96017-49300</p>
                        </div>
                     </div>
                     <div className="flex items-start gap-4 group">
                         <div className="p-3 bg-white/10 rounded-xl group-hover:bg-accent group-hover:text-white transition-all backdrop-blur-sm shrink-0">
                          <Mail size={24} /> 
                         </div>
                         <div>
                            <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold mb-1">Email Us</p>
                            <p className="font-bold text-lg break-all">info@smartinstitute.co.in</p>
                        </div>
                     </div>
                     <div className="flex items-start gap-4 group">
                        <div className="p-3 bg-white/10 rounded-xl group-hover:bg-accent group-hover:text-white transition-all backdrop-blur-sm shrink-0">
                          <MapPin size={24} /> 
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold mb-1">Visit Us</p>
                            <p className="font-bold text-lg leading-snug">Surat, Gujarat</p>
                        </div>
                     </div>
                  </div>
                </div>

                <div className="relative z-10 mt-12 pt-8 border-t border-white/10">
                    <p className="text-xs text-gray-400">© Smart Institute. All rights reserved.</p>
                </div>
              </div>
              
              {/* Right Form Panel */}
              <div className="lg:w-3/5 p-8 md:p-12 bg-white">
                <div className="mb-8">
                    <h3 className="text-2xl font-bold text-gray-800 mb-2">Admission Inquiry</h3>
                    <p className="text-gray-500">Take the first step towards your career.</p>
                </div>

                <form className="space-y-5" onSubmit={handleSubmit}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">Full Name <span className="text-red-500">*</span></label>
                        <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Enter Your Full Name Here..." className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium" required />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">Mobile Number <span className="text-red-500">*</span></label>
                        <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="Enter Your Mobile Number Here..." className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium" required />
                    </div>
                  </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">Email Address</label>
                            <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="Enter Your Email Here..." className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">City <span className="text-red-500">*</span></label>
                            <input type="text" name="city" value={formData.city} onChange={handleChange} placeholder="Enter City" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium" required/>
                        </div>
                   </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-1.5">
                             <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">State <span className="text-red-500">*</span></label>
                             <input type="text" name="state" value={formData.state} onChange={handleChange} placeholder="Enter State" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium" required />
                        </div>
                         {/* Branch Selection - Dynamic */}
            <div>
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">Select Branch <span className="text-red-500">*</span></label>
              <div className="relative">
                <select 
                  name="branchId"
                  value={formData.branchId}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all appearance-none text-gray-700 font-medium cursor-pointer hover:bg-white"
                  required
                >
                  <option value="">Choose a Branch...</option>
                  {branches && Array.isArray(branches) && branches.map(branch => (
  <option key={branch._id} value={branch._id}>{branch.name} ({branch.city})</option>
))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                  <ChevronDown size={20} />
                </div>
              </div>
            </div>
                    </div>
                  
                  <div className="space-y-1.5">
                     <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">Interested Course <span className="text-red-500">*</span></label>
                     <select name="course" value={formData.course} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-gray-700 font-medium cursor-pointer hover:bg-white transition-colors" required>
                        <option value="">Select a Course...</option>
                        {courses.map(course => (
                            <option key={course._id} value={course._id}>{course.name}</option>
                        ))}
                     </select>
                  </div>
                  
                  <div className="space-y-1.5 pt-2">
                      <div className="flex items-center justify-between">
                         <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">Security Code <span className="text-red-500">*</span></label>
                         <button type="button" onClick={generateCaptcha} className="text-xs text-primary font-bold hover:underline flex items-center gap-1">
                             Refresh Code
                         </button>
                      </div>
                      <div className="flex gap-3 items-stretch">
                        <div className="bg-gray-100 border border-gray-300 rounded-xl px-4 flex items-center justify-center min-w-[100px] select-none">
                            <span className="text-2xl font-mono font-bold text-gray-600 tracking-widest">{captcha}</span>
                        </div>
                        <input type="text" value={userCaptcha} onChange={(e) => setUserCaptcha(e.target.value)} placeholder="Type code here" className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium uppercase placeholder:normal-case" required />
                      </div>
                  </div>

                  <button disabled={formLoading} className="w-full bg-accent text-white font-bold py-4 rounded-xl hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/30 hover:shadow-orange-600/40 transform hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed mt-6 text-lg tracking-wide flex items-center justify-center gap-2">
                    {formLoading && <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                    {formLoading ? 'Submitting Application...' : 'Submit Inquiry Now'}
                  </button>
                </form>
              </div>
            </div>
            </Reveal>
          </div>
        </div>
  
        <div className="grid grid-cols-1 lg:grid-cols-2">
        {/* 4. Student Success Stories (Toppers) */}
        <div className="bg-white py-16 lg:h-[700px] lg:overflow-hidden lg:border-r lg:border-gray-200">
          <div className="container mx-auto px-4 text-center">
            <Reveal>
              <h4 className="text-accent font-bold uppercase tracking-widest text-sm mb-3">Hall of Fame</h4>
              <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-4">Student <span className="text-primary">Success Stories</span></h2>
              <p className="text-gray-500 mb-12 max-w-2xl mx-auto text-lg">Celebrating the academic excellence and outstanding achievements of our brilliant students who have made us proud.</p>
              {toppersLoading ? (
                  <div className="py-20 text-gray-400 italic">Loading success stories...</div>
              ) : toppers.length > 0 ? (
                  <Carousel items={toppers} />
              ) : (
                  <div className="py-20 text-gray-400 italic">No success stories to display yet.</div>
              )}
            </Reveal>
          </div>
        </div>
        {/* 5. Latest News - Carousel */}
        <div className="border-t border-gray-200 bg-slate-50 py-16 lg:h-[700px] lg:overflow-hidden lg:border-t-0">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row justify-between items-end mb-10 gap-4">
               <div>
                 <h4 className="text-accent font-bold uppercase tracking-widest text-sm mb-3">Campus Updates</h4>
                 <h2 className="text-3xl md:text-4xl font-black text-gray-900">Latest <span className="text-primary">News & Events</span></h2>
               </div>
               <a href="/news" className="text-primary font-bold hover:text-blue-700 flex items-center gap-2 group transition-colors">
                 View All News <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform"/>
               </a>
            </div>
            
            <Reveal>
              {newsLoading ? (
                <div className="space-y-4">{Array(3).fill(0).map((_, i) => <div key={i} className="h-32 animate-pulse rounded-2xl border border-gray-100 bg-white p-4 shadow-sm" />)}</div>
              ) : latestNews.length === 0 ? (
                <div className="rounded-2xl border border-gray-100 bg-white py-12 text-center text-gray-500 shadow-sm"><Calendar size={24} className="mx-auto mb-4 text-gray-400" /><p className="text-lg font-medium">No recent news available.</p></div>
              ) : (
                <div className="news-vertical-viewport h-[480px] overflow-hidden pr-2">
                  <div className="news-vertical-track space-y-4">
                    {[...latestNews, ...latestNews].map((item, index) => (
                      <article key={`${item._id}-${index}`} onClick={() => setSelectedNews(item)} className="group flex cursor-pointer overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all hover:shadow-lg">
                        {item.image && <div className="w-28 shrink-0 overflow-hidden bg-gray-100"><img src={item.image} alt={item.title} className="h-full w-full object-cover" /></div>}
                        <div className="min-w-0 flex-1 p-4">
                          <span className="flex items-center gap-1 text-[11px] font-bold uppercase text-gray-400"><Calendar size={12} />{formatDate(item.releaseDate) || 'Recent'}</span>
                          <h3 className="mt-2 line-clamp-2 text-base font-bold text-gray-800 group-hover:text-primary">{item.title}</h3>
                          <p className="mt-2 line-clamp-2 text-sm text-gray-500">{item.smallDetail || item.description}</p>
                          <span className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-primary">Read More <ChevronRight size={15} /></span>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              )}
            </Reveal>
          </div>
        </div>

        </div>

        {/* 6. Feedback Section */}
        <FeedbackSection />

        {/* News Detail Modal */}
        {selectedNews && (
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn"
            onClick={() => setSelectedNews(null)}
          >
            <div 
              className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-2xl transform transition-all"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-primary to-blue-600 text-white p-6 relative">
                <button 
                  onClick={() => setSelectedNews(null)}
                  className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
                >
                  <X size={24} />
                </button>
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex items-center gap-2 text-xs font-bold bg-white/20 px-3 py-1.5 rounded-full">
                    <Calendar size={14} />
                    <span>{formatDate(selectedNews.releaseDate)}</span>
                  </div>
                  {selectedNews.isBreaking && (
                    <div className="bg-red-500 text-white text-xs font-black px-3 py-1.5 rounded-full uppercase tracking-wide flex items-center gap-1">
                      <AlertCircle size={14} /> Breaking News
                    </div>
                  )}
                </div>
                <h2 className="text-2xl md:text-3xl font-black leading-tight">
                  {selectedNews.title}
                </h2>
              </div>
              
              {/* Modal Body */}
              <div className="p-6 md:p-8 overflow-y-auto max-h-[calc(90vh-200px)]">
                {selectedNews.image && (
                  <img src={selectedNews.image} alt={selectedNews.title} className="w-full max-h-80 object-cover rounded-2xl mb-6 border border-gray-100" />
                )}
                {selectedNews.smallDetail && (
                  <p className="text-lg font-semibold text-gray-700 mb-4 pb-4 border-b border-gray-200">
                    {selectedNews.smallDetail}
                  </p>
                )}
                <div className="prose prose-lg max-w-none text-gray-600 leading-relaxed whitespace-pre-wrap">
                  {selectedNews.description || 'No detailed description available.'}
                </div>
              </div>
              
              {/* Modal Footer */}
              <div className="bg-gray-50 px-6 md:px-8 py-4 flex flex-wrap justify-end gap-3 border-t border-gray-200">
                {selectedNews.linkUrl && (
                  <a
                    href={selectedNews.linkUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-6 py-2.5 bg-primary text-white font-bold rounded-xl hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
                  >
                    {selectedNews.linkLabel || 'Open Link'} <ExternalLink size={16} />
                  </a>
                )}
                <button 
                  onClick={() => setSelectedNews(null)}
                  className="px-6 py-2.5 bg-gray-900 text-white font-bold rounded-xl hover:bg-primary transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };
  
  export default HomePage;
