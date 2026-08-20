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
import awardService from '../services/awardService';
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
    <div className="relative group px-4 sm:px-8 md:px-10">
      <style>
        {`
          .swiper-button-disabled {
            opacity: 0.3;
            cursor: not-allowed;
          }
          .topper-swiper {
            padding-bottom: 2rem !important;
            padding-top: 0.5rem !important;
          }
          .topper-swiper .swiper-slide {
            height: auto;
            opacity: 1 !important;
            transform: none !important;
            transition: all 0.3s ease;
          }
        `}
      </style>
      <Swiper
        modules={[Navigation, Autoplay]}
        spaceBetween={24}
        slidesPerView={1}
        centeredSlides={false}
        loop={items.length > 3}
        autoplay={{
          delay: 3500,
          disableOnInteraction: false,
          pauseOnMouseEnter: true
        }}
        navigation={{
           nextEl: '.swiper-button-next-custom',
           prevEl: '.swiper-button-prev-custom',
        }}
        breakpoints={{
          320: {
            slidesPerView: 1,
            spaceBetween: 16,
          },
          640: {
            slidesPerView: 2,
            spaceBetween: 20,
          },
          1024: {
            slidesPerView: 3,
            spaceBetween: 24,
          },
        }}
        className="topper-swiper"
      >
        {items.map((item, index) => (
          <SwiperSlide key={index} className="h-auto flex items-stretch">
            <div className="topper-card bg-white p-5 rounded-2xl shadow-xl shadow-slate-200/80 border border-gray-200/90 flex flex-col justify-between w-full transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/15 hover:border-primary/40 hover:-translate-y-1.5 group/card">
              <div>
                {/* Square Student Image Frame - Compact size with smooth border radius */}
                <div className="relative w-36 h-36 sm:w-40 sm:h-40 mx-auto rounded-3xl overflow-hidden bg-slate-50 mb-4 border border-gray-200 shadow-sm flex items-center justify-center p-1.5 group/img">
                  <img 
                    src={item.image} 
                    alt={item.name} 
                    className="w-full h-full object-contain rounded-2xl group-hover/card:scale-105 transition-transform duration-500" 
                  />
                  <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-md px-2 py-0.5 rounded-full shadow text-[10px] font-bold text-accent border border-gray-100 flex items-center gap-1">
                    <Trophy size={12} className="text-yellow-500" /> Topper
                  </div>
                </div>

                <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-1 text-center line-clamp-1">{item.name}</h3>
                <p className="text-primary font-semibold text-xs sm:text-sm mb-3 uppercase tracking-wide text-center line-clamp-2 min-h-[2.2rem] flex items-center justify-center">{item.course}</p>
              </div>

              {/* Score Box */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50/60 p-3 rounded-xl text-center border border-blue-100/80 mt-auto">
                <div className="text-2xl sm:text-3xl font-black text-accent">{item.percentage}%</div>
                <div className="text-[9px] sm:text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">Score Achieved</div>
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
      
      {/* Custom Navigation Buttons */}
      <button className="swiper-button-prev-custom absolute left-0 top-1/2 -translate-y-1/2 bg-white text-gray-800 p-2.5 rounded-full shadow-xl hover:bg-primary hover:text-white transition-all z-20 cursor-pointer border border-gray-100 hidden md:flex items-center justify-center">
        <ChevronLeft size={20} />
      </button>
      <button className="swiper-button-next-custom absolute right-0 top-1/2 -translate-y-1/2 bg-white text-gray-800 p-2.5 rounded-full shadow-xl hover:bg-primary hover:text-white transition-all z-20 cursor-pointer border border-gray-100 hidden md:flex items-center justify-center">
        <ChevronRight size={20} />
      </button>
    </div>
  );
};

const AchievementsCarousel = ({ items }) => {
  const displayItems = items && items.length > 0 
    ? (items.length < 3 ? [...items, ...items, ...items, ...items] : [...items, ...items])
    : [];

  return (
    <div className="rounded-2xl bg-white border-2 border-gray-200 shadow-xl p-4 h-[390px] flex flex-col overflow-hidden">
      <div className="awards-vertical-viewport flex-1 overflow-hidden">
        <div className="awards-vertical-track space-y-3">
          {displayItems.map((award, index) => (
            <div 
              key={award._id ? `${award._id}-${index}` : index} 
              className="group flex flex-col sm:flex-row cursor-pointer overflow-hidden rounded-xl border border-gray-100 bg-white p-3 shadow-sm hover:shadow-md hover:border-gray-200 transition-all duration-300 gap-3"
            >
              {/* Image Box */}
              <div className="w-full sm:w-28 h-28 sm:h-24 shrink-0 overflow-hidden rounded-lg bg-gray-50 border relative">
                {award.image ? (
                  <img src={award.image} alt={award.title} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-50 via-indigo-50 to-slate-100 flex flex-col items-center justify-center text-primary/70">
                    <Award size={28} className="text-primary mb-1" />
                    <span className="text-[8px] font-bold text-gray-500 uppercase">Award</span>
                  </div>
                )}
                {/* Date overlay */}
                <div className="absolute bottom-1 left-1 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded text-[9px] font-semibold text-white flex items-center gap-1">
                  <Calendar size={9} className="text-amber-400" /> {formatDate(award.date)}
                </div>
              </div>

              {/* Text Content */}
              <div className="min-w-0 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1 text-[9px] font-extrabold uppercase text-primary tracking-wider mb-1">
                    <Trophy size={11} className="text-yellow-500" /> Award & Recognition
                  </div>
                  <h4 className="line-clamp-1 text-sm sm:text-base font-extrabold text-gray-800 group-hover:text-primary transition-colors leading-snug">
                    {award.title}
                  </h4>
                  <p className="mt-1 line-clamp-2 text-xs text-gray-600 font-normal leading-relaxed">
                    {award.description || 'Honoring excellence and commitment to educational achievement at Smart Institute.'}
                  </p>
                </div>
                <div className="mt-2 flex items-center justify-between pt-1 border-t border-gray-100">
                  <span className="text-[10px] font-bold text-primary flex items-center gap-1">
                    Smart Academy <Sparkles size={11} className="text-amber-500" />
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const HeroBannerVisual = ({ items }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const swiperRef = useRef(null);

  const defaultBanners = [
    {
      image: HeroImage2,
      title: 'Manish Kushwaha',
      linkLabel: 'Designer',
      linkUrl: 'French Crown',
      description: 'As a student of the UI/UX & Graphic Design course, I gained both technical and creative skills. The support I received from the mentors helped me become confident in my abilities.'
    }
  ];

  const slides = items && items.length > 0 ? items : defaultBanners;
  const shouldLoop = slides.length > 1;

  return (
    <div className="relative w-full h-full min-h-[420px] sm:min-h-[520px] flex items-center justify-center py-4">
      <Swiper
        key={slides.length}
        onSwiper={(swiper) => { swiperRef.current = swiper; }}
        onSlideChange={(swiper) => setActiveIndex(swiper.realIndex)}
        modules={[Autoplay, EffectFade]}
        effect="fade"
        fadeEffect={{ crossFade: true }}
        slidesPerView={1}
        loop={shouldLoop}
        speed={800}
        autoplay={shouldLoop ? {
          delay: 4000,
          disableOnInteraction: false,
          pauseOnMouseEnter: true
        } : false}
        className="w-full h-full"
      >
        {slides.map((item, index) => {
          const bannerImage = getMediaUrl(item.image) || HeroImage2;
          const studentName = item.title ? item.title.trim() : '';
          const studentRole = item.linkLabel ? item.linkLabel.trim() : '';
          const companyName = item.linkUrl ? item.linkUrl.trim() : '';
          const studentDesc = item.description ? item.description.trim() : '';

          const hasCardContent = Boolean(studentName || studentRole || companyName || studentDesc);

          return (
            <SwiperSlide key={item._id || `${item.image}-${index}`} className="w-full h-full flex items-center justify-center relative">
              <div className="relative w-full max-w-[440px] sm:max-w-[500px] lg:max-w-[540px] mx-auto h-[420px] sm:h-[480px] lg:h-[520px] flex items-end justify-center">
                
                {/* 1. Large Pastel Cream Circle Backdrop (Half Circle Effect) */}
                <div className="absolute bottom-4 w-[310px] h-[310px] sm:w-[390px] sm:h-[390px] lg:w-[430px] lg:h-[430px] rounded-full bg-[#fdf6ea] border border-amber-100/70 shadow-inner z-0 flex items-center justify-center overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-b from-amber-100/40 via-transparent to-white/80 rounded-full" />
                  
                  {/* Company Logo (Si2.png) Watermark Background (Enlarged & High Visibility) */}
                  <img
                    src="/Si2.png"
                    alt="Company Logo Watermark"
                    className="w-[320px] sm:w-[420px] lg:w-[460px] max-h-[90%] object-contain opacity-65 select-none pointer-events-none transform -translate-y-2 filter drop-shadow-md transition-all duration-300"
                  />
                </div>

                {/* 2. Student Photo Standing over the Circle with Soft Bottom Fade */}
                <div className="relative z-10 w-full h-full flex items-end justify-center">
                  <img
                    src={bannerImage}
                    alt={studentName || 'Student banner'}
                    className="h-[390px] sm:h-[460px] lg:h-[500px] w-auto max-w-[95%] object-contain object-bottom drop-shadow-xl transition-all duration-700 mix-blend-multiply [mask-image:linear-gradient(to_bottom,black_85%,transparent_100%)]"
                  />
                  {/* Subtle white bottom gradient blur to seamlessly blend transparent or white-bg photo */}
                  <div className="absolute bottom-0 inset-x-0 h-10 bg-gradient-to-t from-white via-white/80 to-transparent z-15 pointer-events-none" />
                </div>

                {/* 3. Floating Student Achievement Card (Positioned in Middle Bottom with high Z-Index in front) */}
                {hasCardContent && (
                  <div className="absolute bottom-2 sm:bottom-4 left-1/2 -translate-x-1/2 z-30 bg-white/95 backdrop-blur-xl p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl shadow-[0_16px_40px_rgba(15,23,42,0.18)] border border-slate-100/90 w-[88%] sm:w-[320px] lg:w-[350px] text-center transform transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_20px_45px_rgba(15,23,42,0.22)]">
                    {/* Subtle top accent gradient bar */}
                    <div className="w-10 h-1 bg-gradient-to-r from-amber-400 via-orange-500 to-indigo-600 rounded-full mx-auto mb-2.5 opacity-90" />

                    {/* Top Quote Paragraph (Rendered ONLY if admin entered description) */}
                    {studentDesc && (
                      <div className="relative px-1 mb-2.5">
                        <Quote size={14} className="text-amber-500 fill-amber-500/20 absolute -top-1 left-0 -rotate-12" />
                        <p className="text-[11px] sm:text-xs text-slate-700 leading-relaxed font-medium italic line-clamp-3 text-center pl-4 pr-1">
                          {studentDesc}
                        </p>
                      </div>
                    )}

                    {/* Meta Info Row */}
                    {(studentName || studentRole || companyName) && (
                      <div className={`flex items-center justify-between gap-2.5 ${studentDesc ? 'border-t border-slate-100 pt-2.5 mt-1' : ''}`}>
                        {/* Student Name & Role */}
                        <div className="min-w-0 text-left flex-1">
                          {studentName && (
                            <h4 className="text-xs sm:text-sm font-black text-slate-900 leading-tight truncate tracking-tight">
                              {studentName}
                            </h4>
                          )}
                          {studentRole && (
                            <p className="text-[10px] sm:text-xs font-bold text-indigo-600 truncate mt-0.5 uppercase tracking-wider">
                              {studentRole}
                            </p>
                          )}
                        </div>

                        {/* Working At / Company Badge */}
                        {companyName && (
                          <div className="shrink-0 bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded-xl text-right">
                            <span className="block text-[8px] font-extrabold tracking-widest uppercase text-slate-400">WORKING AT</span>
                            <span className="block text-[10px] sm:text-xs font-black text-slate-800 truncate max-w-[100px]">
                              {companyName}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

              </div>
            </SwiperSlide>
          );
        })}
      </Swiper>

      {/* Pagination indicators */}
      {shouldLoop && (
        <div className="absolute top-3 right-4 sm:right-6 z-30 flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20 shadow-md">
          {slides.map((item, index) => (
            <button
              key={item._id || index}
              onClick={() => swiperRef.current?.slideToLoop(index)}
              className={`h-2 rounded-full transition-all duration-500 cursor-pointer ${
                activeIndex === index
                  ? 'w-6 bg-[#f15a24] shadow-md shadow-[#f15a24]/60'
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

const AnimatedCounter = ({ targetValue, formatFn }) => {
  const [count, setCount] = useState(0);
  const [isIntersecting, setIsIntersecting] = useState(false);
  const elementRef = useRef(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        setIsIntersecting(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => {
      if (elementRef.current) {
        observer.unobserve(elementRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const end = Number(targetValue);
    if (isNaN(end) || end <= 0) {
      setCount(0);
      return;
    }

    if (isIntersecting && !hasAnimated.current) {
      hasAnimated.current = true;
      let startTime = null;
      const duration = 1800; // 1.8 seconds duration

      const animate = (timestamp) => {
        if (!startTime) startTime = timestamp;
        const progress = timestamp - startTime;
        const rate = Math.min(progress / duration, 1);
        
        // Easing function (easeOutExpo)
        const easeRate = rate === 1 ? 1 : 1 - Math.pow(2, -10 * rate);
        const current = Math.floor(easeRate * end);
        
        setCount(current);

        if (rate < 1) {
          requestAnimationFrame(animate);
        } else {
          setCount(end);
        }
      };

      requestAnimationFrame(animate);
    }
  }, [targetValue, isIntersecting]);

  return <span ref={elementRef}>{formatFn ? formatFn(count) : count}</span>;
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
    const [awards, setAwards] = useState([]);
    const [awardsLoading, setAwardsLoading] = useState(true);
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
      fetchAwards();
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

    const fetchAwards = async () => {
        try {
            const data = await awardService.getPublicAwards();
            const sortedData = [...data].sort((a,b) => new Date(b.date) - new Date(a.date));
            setAwards(sortedData);
        } catch (error) {
            console.error("Failed to load awards", error);
        } finally {
            setAwardsLoading(false);
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
        <div className="relative bg-white pt-6 pb-12 sm:pt-8 sm:pb-16 overflow-hidden min-h-auto lg:min-h-[580px] lg:h-[640px] flex items-center">

          {/* Right image elements (absolute relative to viewport edge) */}
          <div className="absolute right-0 top-0 bottom-0 w-[62%] hidden md:block overflow-hidden z-0">
            {/* Blue background decoration (rounded left, full height) */}
            <div className="absolute right-0 top-0 bottom-0 w-[480px] lg:w-[640px] bg-[#0a1931] rounded-l-full shadow-2xl z-0"></div>

            {/* Dotted pattern */}
            <div className="absolute bottom-[15%] right-[580px] lg:right-[760px] w-20 h-20 opacity-15 bg-[radial-gradient(#f15a24_2px,transparent_2px)] [background-size:12px_12px] z-10"></div>

            {/* Orange stroke curved line (parallel to white border) */}
            <div className="absolute right-0 top-0 bottom-0 w-[530px] lg:w-[710px] rounded-l-full border-l-2 border-[#f15a24] z-10 pointer-events-none"></div>

            {/* Banner image container (curved left, white border on left, full height of hero section) */}
            <div className="absolute right-0 top-0 bottom-0 w-[520px] lg:w-[700px] rounded-l-full overflow-hidden border-l-[8px] border-white shadow-xl bg-slate-50 z-10 flex items-center justify-center">
              <HeroBannerVisual items={heroImages} />
            </div>
          </div>

          <div className="container mx-auto px-4 sm:px-6 lg:px-8 z-10 relative">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">

              {/* Left text column */}
              <div className="lg:col-span-6 space-y-5 sm:space-y-8 text-left z-10">
                <div className="inline-flex flex-wrap items-center gap-1.5 text-xs sm:text-[13px] font-extrabold tracking-widest uppercase">
                  <span className="text-[#0a1931]">
                    DREAM BIG. LEARN SMART. ACHIEVE MORE.
                  </span>
                </div>

                <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.15] text-[#0a1931]">
                  Learn Skills... <br />
                  <span className="text-[#1d4ed8]">
                    Build Professional Jobs
                  </span>
                </h1>

                <p className="text-slate-600 text-sm sm:text-lg max-w-xl leading-relaxed font-normal">
                  Industry-focused courses designed for real careers. Build confidence with practical training and live projects. Take the first step toward your dream job.
                </p>

                {/* Key Features row/grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6 pt-4 pb-6 border-b border-gray-100">
                  <div className="flex flex-col items-start space-y-1.5 sm:space-y-2">
                    <div className="p-2.5 sm:p-3 bg-blue-50 text-primary rounded-xl sm:rounded-2xl">
                      <GraduationCap size={20} className="sm:w-6 sm:h-6 text-[#1e3a8a]" />
                    </div>
                    <span className="text-xs sm:text-sm font-extrabold text-slate-800 tracking-tight leading-tight">Expert Faculty</span>
                  </div>

                  <div className="flex flex-col items-start space-y-1.5 sm:space-y-2">
                    <div className="p-2.5 sm:p-3 bg-orange-50 text-[#f15a24] rounded-xl sm:rounded-2xl">
                      <Sparkles size={20} className="sm:w-6 sm:h-6 text-[#f15a24]" />
                    </div>
                    <span className="text-xs sm:text-sm font-extrabold text-slate-800 tracking-tight leading-tight">Practical Learning</span>
                  </div>

                  <div className="flex flex-col items-start space-y-1.5 sm:space-y-2">
                    <div className="p-2.5 sm:p-3 bg-blue-50 text-primary rounded-xl sm:rounded-2xl">
                      <Award size={20} className="sm:w-6 sm:h-6 text-[#1e3a8a]" />
                    </div>
                    <span className="text-xs sm:text-sm font-extrabold text-slate-800 tracking-tight leading-tight">Certification</span>
                  </div>

                  <div className="flex flex-col items-start space-y-1.5 sm:space-y-2">
                    <div className="p-2.5 sm:p-3 bg-orange-50 text-[#f15a24] rounded-xl sm:rounded-2xl">
                      <Briefcase size={20} className="sm:w-6 sm:h-6 text-[#f15a24]" />
                    </div>
                    <span className="text-xs sm:text-sm font-extrabold text-slate-800 tracking-tight leading-tight">Placement Support</span>
                  </div>
                </div>

                {/* CTA Buttons */}
                <div className="flex flex-wrap items-center gap-4 sm:gap-6 pt-1 sm:pt-2">
                  <button
                    onClick={() => {
                      const target = document.getElementById('courses-section');
                      if (target) {
                        target.scrollIntoView({ behavior: 'smooth' });
                      } else {
                        navigate('/course');
                      }
                    }}
                    className="inline-flex items-center gap-2.5 sm:gap-3 bg-[#0a1931] hover:bg-[#1e3a8a] text-white px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl font-bold uppercase tracking-wider transition-all duration-300 hover:shadow-lg shadow-black/25 transform hover:-translate-y-0.5 text-xs sm:text-sm"
                  >
                    EXPLORE COURSES <ArrowRight size={16} />
                  </button>
                </div>
              </div>

              {/* Right column spacer for mobile/desktop */}
              <div className="lg:col-span-6 md:col-span-6 h-auto md:h-auto relative flex items-center justify-center">
                <div className="md:hidden relative w-full flex items-center justify-center py-2 sm:py-4 px-1">
                  <div className="w-full max-w-[360px] sm:max-w-[480px] aspect-[16/10] rounded-2xl sm:rounded-3xl overflow-hidden border-4 sm:border-8 border-white shadow-2xl bg-[#0a1931] relative z-10">
                    <HeroBannerVisual items={heroImages} mobile />
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Stats Section overlapping */}
        <div className="relative z-20 w-full mt-[-1.5rem] sm:mt-[-2rem] mb-8 sm:mb-12">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white/95 backdrop-blur-md rounded-2xl sm:rounded-3xl shadow-[0_15px_45px_rgba(10,25,49,0.12)] border border-slate-100 p-3.5 sm:p-6 md:p-8">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 sm:gap-4 md:gap-5 items-stretch">

                {/* 1. Students Trained */}
                <div className="flex items-center gap-2.5 sm:gap-4 p-2.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white shadow-sm border border-slate-100 hover:shadow-md transition-all duration-300 justify-start">
                  <div className="p-2 sm:p-3 bg-blue-50/90 rounded-xl sm:rounded-2xl shrink-0">
                    <GraduationCap size={22} className="sm:w-7 sm:h-7 text-[#0a1931]" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-lg sm:text-2xl md:text-3xl font-black text-[#0a1931]">
                      <AnimatedCounter targetValue={homeStats.studentsTrained} formatFn={formatStatNumber} />+
                    </div>
                    <div className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider truncate">Students Trained</div>
                  </div>
                </div>

                {/* 2. Expert Faculty */}
                <div className="flex items-center gap-2.5 sm:gap-4 p-2.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white shadow-sm border border-slate-100 hover:shadow-md transition-all duration-300 justify-start">
                  <div className="p-2 sm:p-3 bg-blue-50/90 rounded-xl sm:rounded-2xl shrink-0">
                    <Users size={22} className="sm:w-7 sm:h-7 text-[#0a1931]" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-lg sm:text-2xl md:text-3xl font-black text-[#0a1931]">
                      <AnimatedCounter targetValue={homeStats.expertFaculty} formatFn={formatStatNumber} />+
                    </div>
                    <div className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider truncate">Expert Faculty</div>
                  </div>
                </div>

                {/* 3. Courses Offered */}
                <div className="flex items-center gap-2.5 sm:gap-4 p-2.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white shadow-sm border border-slate-100 hover:shadow-md transition-all duration-300 justify-start">
                  <div className="p-2 sm:p-3 bg-blue-50/90 rounded-xl sm:rounded-2xl shrink-0">
                    <BookOpen size={22} className="sm:w-7 sm:h-7 text-[#0a1931]" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-lg sm:text-2xl md:text-3xl font-black text-[#0a1931]">
                      <AnimatedCounter targetValue={homeStats.coursesOffered} formatFn={formatStatNumber} />+
                    </div>
                    <div className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider truncate">Courses Offered</div>
                  </div>
                </div>

                {/* 4. Success Rate */}
                <div className="flex items-center gap-2.5 sm:gap-4 p-2.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white shadow-sm border border-slate-100 hover:shadow-md transition-all duration-300 justify-start">
                  <div className="p-2 sm:p-3 bg-blue-50/90 rounded-xl sm:rounded-2xl shrink-0">
                    <ShieldCheck size={22} className="sm:w-7 sm:h-7 text-[#0a1931]" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-lg sm:text-2xl md:text-3xl font-black text-[#0a1931]">
                      <AnimatedCounter targetValue={homeStats.successRate} formatFn={formatStatNumber} />%
                    </div>
                    <div className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider truncate">Success Rate</div>
                  </div>
                </div>

                {/* 5. Recruitment Partners */}
                <div className="flex items-center gap-2.5 sm:gap-4 p-2.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white shadow-sm border border-slate-100 hover:shadow-md transition-all duration-300 justify-start col-span-2 sm:col-span-1 md:col-span-1">
                  <div className="p-2 sm:p-3 bg-blue-50/90 rounded-xl sm:rounded-2xl shrink-0">
                    <Handshake size={22} className="sm:w-7 sm:h-7 text-[#0a1931]" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-lg sm:text-2xl md:text-3xl font-black text-[#0a1931]">
                      <AnimatedCounter targetValue={homeStats.recruitmentPartners} formatFn={formatStatNumber} />+
                    </div>
                    <div className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider truncate">Recruitment Partners</div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>

        {/* 2. Popular & Category Courses */}
        <div id="courses-section" className="pt-4 pb-12 sm:pt-6 sm:pb-20 bg-white">
          <div className="container mx-auto px-4 sm:px-6">
            <Reveal>
              <div className="text-center mb-8 sm:mb-12">
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-[#0a1931] tracking-tight mb-2">Our <span className="bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">Offerings</span></h2>
                <h3 className="text-base sm:text-lg font-bold text-accent uppercase tracking-wider mb-3">Most Demanded Courses</h3>
                <p className="text-gray-500 text-sm sm:text-base max-w-4xl mx-auto">Choose from our wide range of professional courses designed to boost your career.</p>
              </div>
            </Reveal>

            {/* Category Filter */}
            <Reveal delay={0.2}>
              <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-8 sm:mb-12">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`px-4 sm:px-6 py-1.5 sm:py-2 rounded-full font-medium text-xs sm:text-sm transition-all ${
                    selectedCategory === 'all' 
                      ? 'bg-primary text-white shadow-md shadow-primary/30' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Most Demanded Courses
                </button>
                {popularCategories.filter(cat => cat.isActive).map((cat, i) => (
                  <button
                    key={cat._id || i}
                    onClick={() => setSelectedCategory(cat._id)}
                    className={`px-4 sm:px-6 py-1.5 sm:py-2 rounded-full font-medium text-xs sm:text-sm transition-all ${
                      selectedCategory === cat._id 
                        ? 'bg-primary text-white shadow-md shadow-primary/30' 
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
                {(selectedCategory === 'all'
                  ? popularCourses
                  : popularCourses.filter(c => (c.category?._id || c.category) === selectedCategory)
                ).map((popularCourse, index) => {
                    const course = popularCourse.course;
                    if (!course) return null;
                    return (
                      <div key={popularCourse._id || index} className="bg-white rounded-2xl shadow-[0_10px_30px_rgba(15,23,42,0.12)] hover:shadow-[0_20px_50px_rgba(37,99,235,0.2)] overflow-hidden border border-gray-200 ring-1 ring-gray-100 transform hover:-translate-y-1.5 transition-all duration-300 group flex flex-col justify-between">
                        <div>
                          <div className="relative h-44 sm:h-48 overflow-hidden">
                            <img 
                              src={course.image || 'https://placehold.co/600x400/e5e7eb/374151?text=Course+Image'} 
                              alt={course.name} 
                              className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700"
                            />
                          </div>
                          <div className="p-5 sm:p-6">
                            <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-1.5">{popularCourse.category?.name || 'Popular'}</div>
                            <h3 className="text-base sm:text-lg font-black text-gray-900 mb-2 leading-tight">{course.name}</h3>
                            {course.smallDescription && (
                              <p className="text-xs sm:text-sm text-gray-500 mb-4 line-clamp-2">{course.smallDescription}</p>
                            )}
                          </div>
                        </div>
                        <div className="px-5 sm:px-6 pb-5 sm:pb-6">
                          <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                            <div>
                              <div className="text-[10px] text-gray-400 uppercase font-semibold">Duration</div>
                              <div className="text-sm sm:text-base font-bold text-gray-800">{course.duration} {course.durationType}</div>
                            </div>
                            <button
                              onClick={() => navigate(`/course/${course._id}`)}
                              className="bg-gradient-to-r from-primary to-blue-700 text-white px-4 sm:px-5 py-2 rounded-xl font-bold text-xs sm:text-sm hover:shadow-lg hover:shadow-primary/30 transition-all"
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
        <div className="bg-slate-50 py-12 sm:py-20 relative overflow-hidden">
             {/* Decorative Elements */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-100/40 rounded-full blur-[100px] translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-orange-100/40 rounded-full blur-[80px] -translate-x-1/2 translate-y-1/3 pointer-events-none"></div>

          <div className="container mx-auto px-4 sm:px-6 relative z-10">
            <Reveal>
            <div className="max-w-6xl mx-auto bg-white rounded-2xl sm:rounded-[2rem] shadow-2xl overflow-hidden flex flex-col lg:flex-row border border-gray-100">
              {/* Left Info Panel */}
              <div className="lg:w-2/5 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-6 sm:p-8 lg:p-12 text-white flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5"></div>
                <div className="relative z-10">
                  <h3 className="text-2xl sm:text-3xl md:text-4xl font-black mb-4 sm:mb-6">Get In Touch</h3>
                  <p className="text-gray-300 text-sm sm:text-lg mb-6 sm:mb-10 leading-relaxed font-light">
                    Have questions about our courses or admissions? Fill out the form and our career counselors will assist you.
                  </p>
                  
                  <div className="space-y-5 sm:space-y-8">
                     <div className="flex items-start gap-3.5 sm:gap-4 group">
                        <div className="p-2.5 sm:p-3 bg-white/10 rounded-xl group-hover:bg-accent group-hover:text-white transition-all backdrop-blur-sm shrink-0">
                          <Phone size={20} className="sm:w-6 sm:h-6" />
                        </div> 
                        <div>
                            <p className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-widest font-semibold mb-0.5 sm:mb-1">Call Us</p>
                            <p className="font-bold text-sm sm:text-lg">+91-96017-49300</p>
                        </div>
                     </div>
                     <div className="flex items-start gap-3.5 sm:gap-4 group">
                         <div className="p-2.5 sm:p-3 bg-white/10 rounded-xl group-hover:bg-accent group-hover:text-white transition-all backdrop-blur-sm shrink-0">
                          <Mail size={20} className="sm:w-6 sm:h-6" /> 
                         </div>
                         <div>
                            <p className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-widest font-semibold mb-0.5 sm:mb-1">Email Us</p>
                            <p className="font-bold text-sm sm:text-lg break-all">info@smartinstitute.co.in</p>
                        </div>
                     </div>
                     <div className="flex items-start gap-3.5 sm:gap-4 group">
                        <div className="p-2.5 sm:p-3 bg-white/10 rounded-xl group-hover:bg-accent group-hover:text-white transition-all backdrop-blur-sm shrink-0">
                          <MapPin size={20} className="sm:w-6 sm:h-6" /> 
                        </div>
                        <div>
                            <p className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-widest font-semibold mb-0.5 sm:mb-1">Visit Us</p>
                            <p className="font-bold text-sm sm:text-lg leading-snug">Surat, Gujarat</p>
                        </div>
                     </div>
                  </div>
                </div>

                <div className="relative z-10 mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-white/10">
                    <p className="text-xs text-gray-400">© Smart Institute. All rights reserved.</p>
                </div>
              </div>
              
              {/* Right Form Panel */}
              <div className="lg:w-3/5 p-5 sm:p-8 md:p-12 bg-white">
                <div className="mb-6 sm:mb-8">
                    <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-1.5">Admission Inquiry</h3>
                    <p className="text-xs sm:text-sm text-gray-500">Take the first step towards your career.</p>
                </div>

                <form className="space-y-4 sm:space-y-5" onSubmit={handleSubmit}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">Full Name <span className="text-red-500">*</span></label>
                        <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Enter Your Full Name Here..." className="w-full px-3.5 sm:px-4 py-2.5 sm:py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-xs sm:text-sm font-medium" required />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">Mobile Number <span className="text-red-500">*</span></label>
                        <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="Enter Your Mobile Number Here..." className="w-full px-3.5 sm:px-4 py-2.5 sm:py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-xs sm:text-sm font-medium" required />
                    </div>
                  </div>

                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">Email Address</label>
                            <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="Enter Your Email Here..." className="w-full px-3.5 sm:px-4 py-2.5 sm:py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-xs sm:text-sm font-medium" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">City <span className="text-red-500">*</span></label>
                            <input type="text" name="city" value={formData.city} onChange={handleChange} placeholder="Enter City" className="w-full px-3.5 sm:px-4 py-2.5 sm:py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-xs sm:text-sm font-medium" required/>
                        </div>
                   </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                        <div className="space-y-1.5">
                             <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">State <span className="text-red-500">*</span></label>
                             <input type="text" name="state" value={formData.state} onChange={handleChange} placeholder="Enter State" className="w-full px-3.5 sm:px-4 py-2.5 sm:py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-xs sm:text-sm font-medium" required />
                        </div>
                         {/* Branch Selection - Dynamic */}
            <div>
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">Select Branch <span className="text-red-500">*</span></label>
              <div className="relative">
                <select 
                  name="branchId"
                  value={formData.branchId}
                  onChange={handleChange}
                  className="w-full px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all appearance-none text-gray-700 text-xs sm:text-sm font-medium cursor-pointer hover:bg-white"
                  required
                >
                  <option value="">Choose a Branch...</option>
                  {branches && Array.isArray(branches) && branches.map(branch => (
  <option key={branch._id} value={branch._id}>{branch.name} ({branch.city})</option>
))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                  <ChevronDown size={18} />
                </div>
              </div>
            </div>
                    </div>
                  
                  <div className="space-y-1.5">
                     <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">Interested Course <span className="text-red-500">*</span></label>
                     <select name="course" value={formData.course} onChange={handleChange} className="w-full px-3.5 sm:px-4 py-2.5 sm:py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-gray-700 text-xs sm:text-sm font-medium cursor-pointer hover:bg-white transition-colors" required>
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
                      <div className="flex gap-2.5 sm:gap-3 items-stretch">
                        <div className="bg-gray-100 border border-gray-300 rounded-xl px-3 sm:px-4 flex items-center justify-center min-w-[90px] sm:min-w-[100px] select-none">
                            <span className="text-xl sm:text-2xl font-mono font-bold text-gray-600 tracking-widest">{captcha}</span>
                        </div>
                        <input type="text" value={userCaptcha} onChange={(e) => setUserCaptcha(e.target.value)} placeholder="Type code here" className="flex-1 px-3.5 sm:px-4 py-2.5 sm:py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-xs sm:text-sm font-medium uppercase placeholder:normal-case" required />
                      </div>
                  </div>

                  <button disabled={formLoading} className="w-full bg-accent text-white font-bold py-3.5 sm:py-4 rounded-xl hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/30 hover:shadow-orange-600/40 transform hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed mt-4 sm:mt-6 text-sm sm:text-lg tracking-wide flex items-center justify-center gap-2">
                    {formLoading && <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                    {formLoading ? 'Submitting Application...' : 'Submit Inquiry Now'}
                  </button>
                </form>
              </div>
            </div>
            </Reveal>
          </div>
        </div>
  
        {/* 4. Latest Updates & Achievements (News + Recognition) */}
        <div className="border-t border-b border-gray-200 bg-slate-50 py-12 sm:py-16">
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
              
              {/* Left Column: Awards & Recognitions (Col span 7 on desktop) */}
              <div className="lg:col-span-7 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-6 gap-3">
                    <div>
                      <h2 className="text-2xl sm:text-3xl font-black text-[#0a1931] tracking-tight mb-1"><span className="bg-gradient-to-r from-[#0a1931] to-primary bg-clip-text text-transparent">Achievements</span></h2>
                      <h3 className="text-xs sm:text-sm font-bold text-accent uppercase tracking-widest">Awards & Recognition</h3>
                    </div>
                    {/* Navigation Buttons for Awards Slider */}
                    <div className="flex items-center gap-2">
                      <button className="awards-prev-custom bg-white hover:bg-primary text-gray-700 hover:text-white p-2 sm:p-2.5 rounded-xl shadow-md border border-gray-200 transition-all cursor-pointer flex items-center justify-center">
                        <ChevronLeft size={18} />
                      </button>
                      <button className="awards-next-custom bg-white hover:bg-primary text-gray-700 hover:text-white p-2 sm:p-2.5 rounded-xl shadow-md border border-gray-200 transition-all cursor-pointer flex items-center justify-center">
                        <ChevronRight size={18} />
                      </button>
                    </div>
                  </div>
                  
                  <Reveal>
                    {awardsLoading ? (
                      <div className="h-[390px] animate-pulse rounded-2xl border-2 border-gray-200 bg-white p-4 shadow-xl" />
                    ) : awards.length === 0 ? (
                      <div className="h-[390px] rounded-2xl border-2 border-gray-200 bg-white py-12 text-center text-gray-500 shadow-xl flex flex-col items-center justify-center">
                        <Award size={40} className="mb-3 text-gray-400" />
                        <p className="text-base font-semibold">No recent awards available.</p>
                      </div>
                    ) : (
                      /* Display Achievements in smooth horizontal Swiper carousel slider */
                      <AchievementsCarousel items={awards} />
                    )}
                  </Reveal>
                </div>
              </div>

              {/* Right Column: Latest News (Col span 5 on desktop) */}
              <div className="lg:col-span-5 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-6 gap-3">
                    <div>
                      <h2 className="text-2xl sm:text-3xl font-black text-[#0a1931] tracking-tight mb-1">Campus <span className="bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">Updates</span></h2>
                      <h3 className="text-xs sm:text-sm font-bold text-accent uppercase tracking-widest">Latest News</h3>
                    </div>
                    <a href="/news" className="text-primary text-xs sm:text-sm font-bold hover:text-blue-700 flex items-center gap-1 group transition-colors shrink-0">
                      View All <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform"/>
                    </a>
                  </div>

                  <Reveal>
                    {newsLoading ? (
                      <div className="h-[390px] animate-pulse rounded-2xl border-2 border-gray-200 bg-white p-4 shadow-xl" />
                    ) : latestNews.length === 0 ? (
                      <div className="h-[390px] rounded-2xl border-2 border-gray-200 bg-white py-12 text-center text-gray-500 shadow-xl flex flex-col items-center justify-center">
                        <Calendar size={32} className="mb-3 text-gray-400" />
                        <p className="text-base font-semibold">No recent news available.</p>
                      </div>
                    ) : (
                      /* Vertical scroll container for latest news */
                      <div className="rounded-2xl bg-white border-2 border-gray-200 shadow-xl p-4 h-[390px] flex flex-col overflow-hidden">
                        <div className="news-vertical-viewport flex-1 overflow-hidden">
                          <div className="news-vertical-track space-y-3">
                            {[...latestNews, ...latestNews].map((item, index) => (
                              <article key={`${item._id}-${index}`} onClick={() => setSelectedNews(item)} className="group flex cursor-pointer overflow-hidden rounded-xl border border-gray-100 bg-white p-3 shadow-sm hover:shadow-md hover:border-gray-200 transition-all duration-300">
                                {item.image && (
                                  <div className="w-16 sm:w-20 h-16 sm:h-20 shrink-0 overflow-hidden rounded-lg bg-gray-50 border">
                                    <img src={item.image} alt={item.title} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                  </div>
                                )}
                                <div className="min-w-0 flex-1 pl-3 flex flex-col justify-between">
                                  <div>
                                    <span className="flex items-center gap-1 text-[9px] font-bold uppercase text-gray-400">
                                      <Calendar size={10} /> {formatDate(item.releaseDate) || 'Recent'}
                                    </span>
                                    <h4 className="mt-1 line-clamp-2 text-xs sm:text-sm font-bold text-gray-800 group-hover:text-primary transition-colors leading-snug">{item.title}</h4>
                                  </div>
                                  <span className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold text-primary self-start hover:underline">
                                    Read More <ChevronRight size={12} />
                                  </span>
                                </div>
                              </article>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </Reveal>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* 5. Student Success Stories (Toppers) Section (Full Width, below News) */}
        <div className="bg-slate-50/70 py-14 sm:py-20 border-b border-gray-200">
          <div className="container mx-auto px-2 sm:px-6 text-center max-w-7xl">
            <Reveal>
              <div className="text-center mb-8 sm:mb-12">
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-[#0a1931] tracking-tight mb-2">Hall of <span className="bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">Fame</span></h2>
                <h3 className="text-base sm:text-lg font-bold text-accent uppercase tracking-wider mb-3">Student Success Stories</h3>
                <p className="text-gray-500 text-sm sm:text-base max-w-4xl mx-auto">Celebrating the academic excellence and outstanding achievements of our brilliant students who have made us proud.</p>
              </div>
              {toppersLoading ? (
                  <div className="py-12 sm:py-20 text-gray-400 italic text-sm">Loading success stories...</div>
              ) : toppers.length > 0 ? (
                  <div className="w-full mx-auto">
                    <Carousel items={toppers} />
                  </div>
              ) : (
                  <div className="py-12 sm:py-20 text-gray-400 italic text-sm">No success stories to display yet.</div>
              )}
            </Reveal>
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
