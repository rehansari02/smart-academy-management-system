import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { fetchCourses } from '../../features/master/masterSlice';
import { 
  Clock, BookOpen, CheckCircle, ArrowLeft, Award, Star, Users,
  GraduationCap, Layers, Plus, Minus
} from 'lucide-react';
import Reveal from '../../components/Reveal';
import { getMediaUrl } from '../../utils/mediaUrl';

const CourseDetailPage = () => {
  const { courseId } = useParams();
  const dispatch = useDispatch();
  const { courses, isLoading } = useSelector((state) => state.master);
  const [activeSection, setActiveSection] = useState('overview');
  const [openOverviewItem, setOpenOverviewItem] = useState('description-0');
  const course = courses.find(c => c._id === courseId);

  useEffect(() => {
    if (courses.length === 0) {
      dispatch(fetchCourses());
    }
  }, [dispatch, courses.length]);

  if (isLoading || !course) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-500">Loading course details...</p>
        </div>
      </div>
    );
  }

  const descriptionLines = course.description
    ? course.description.split('\n').map(line => line.trim()).filter(Boolean)
    : [];
  const courseImage = getMediaUrl(course.image) || `https://placehold.co/900x560/png?text=${encodeURIComponent(course.name)}`;
  const cleanSmallDescription = (course.smallDescription || '').trim();
  const isSubjectLikeDescription = cleanSmallDescription.startsWith('>')
    || (cleanSmallDescription.match(/>/g) || []).length >= 2;
  const heroDescription = isSubjectLikeDescription
    ? 'Career focused course with practical learning and expert guidance.'
    : cleanSmallDescription || 'Career focused course with practical learning and expert guidance.';
  const descriptionHeadingPattern = /^(\d+[).]\s*)?([A-Za-z][A-Za-z0-9\s/&+-]{2,45}):$/;
  const hasDescriptionHeadings = descriptionLines.some(line => descriptionHeadingPattern.test(line));

  const descriptionSections = descriptionLines.reduce((sections, line) => {
    const headingMatch = line.match(descriptionHeadingPattern);

    if (headingMatch) {
      sections.push({
        id: `description-${sections.length}`,
        title: headingMatch[2].trim(),
        lines: [],
      });
      return sections;
    }

    if (sections.length === 0) {
      sections.push({
        id: 'description-0',
        title: 'Course Overview',
        lines: [],
      });
    }

    sections[sections.length - 1].lines.push(line);
    return sections;
  }, []);

  const hasDescription = descriptionSections.some(section => section.lines.length > 0);

  const sections = [
    {
      id: 'overview',
      title: 'Overview',
      icon: BookOpen,
      content: (
        <div className="space-y-5 text-gray-700 leading-relaxed">
          {hasDescription && hasDescriptionHeadings ? (
            <div className="space-y-3">
              {descriptionSections.map((section) => {
                const isOpen = openOverviewItem === section.id;

                return (
                  <div key={section.id} className="overflow-hidden rounded-xl border border-gray-100 bg-gray-50/70">
                    <button
                      type="button"
                      onClick={() => setOpenOverviewItem(isOpen ? '' : section.id)}
                      className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-bold text-gray-900 transition-colors hover:bg-blue-50 hover:text-primary"
                    >
                      <span>{section.title}</span>
                      {isOpen ? (
                        <Minus size={20} className="shrink-0 text-primary" />
                      ) : (
                        <Plus size={20} className="shrink-0" />
                      )}
                    </button>
                    {isOpen && (
                      <div className="space-y-3 border-t border-gray-100 bg-white px-5 py-4 text-justify">
                        {section.lines.length > 0 ? (
                          section.lines.map((line, index) => <p key={index}>{line}</p>)
                        ) : (
                          <p>Details are being updated.</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : hasDescription ? (
            <div className="space-y-3 text-justify">
              {descriptionSections.flatMap(section => section.lines).map((line, index) => (
                <p key={index}>{line}</p>
              ))}
            </div>
          ) : (
            <p>No description available for this course.</p>
          )}
        </div>
      ),
    },
    {
      id: 'subjects',
      title: 'Subjects',
      icon: Layers,
      content: course.subjects && course.subjects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {course.subjects.map((sub, index) => (
            <div key={index} className="flex items-center gap-3 p-4 rounded-xl border border-gray-100 bg-white hover:border-primary/30 hover:bg-blue-50/50 transition-colors">
              <div className="bg-primary/10 text-primary p-2 rounded-full">
                <CheckCircle size={18} />
              </div>
              <span className="font-semibold text-gray-800">{sub.subject?.name || 'Subject Name'}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-gray-500 italic">Subject details are being updated.</div>
      ),
    },
    {
      id: 'fees',
      title: 'Course Details',
      icon: Clock,
      content: (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InfoTile icon={Clock} label="Duration" value={`${course.duration} ${course.durationType}`} />
          <InfoTile icon={BookOpen} label="Subjects" value={`${course.subjects?.length || 0} Modules`} />
          <InfoTile icon={Award} label="Certificate" value="Valid Govt. Recognized" />
          <InfoTile icon={Star} label="Level" value="Popular Course" />
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20">
      <section className="bg-gradient-to-br from-slate-950 via-blue-950 to-primary text-white">
        <div className="container mx-auto px-4 py-10 md:py-16">
          <Link to="/course" className="inline-flex items-center text-blue-100 hover:text-white mb-8 transition-colors gap-2">
            <ArrowLeft size={20} /> Back to Courses
          </Link>

          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-8 items-center">
            <div className="max-w-3xl">
              <div className="flex flex-wrap items-center gap-3 mb-5">
                {course.courseType && (
                  <span className="bg-white/15 border border-white/20 backdrop-blur px-4 py-2 rounded-full text-sm font-bold uppercase tracking-wide">
                    {course.courseType}
                  </span>
                )}
                {course.shortName && (
                  <span className="bg-accent text-white px-4 py-2 rounded-full text-sm font-bold uppercase tracking-wide">
                    {course.shortName}
                  </span>
                )}
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-5 leading-tight">{course.name}</h1>
              <p className="text-lg md:text-xl text-blue-100 leading-relaxed">{heroDescription}</p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-8">
                <HeroStat icon={Clock} label="Duration" value={`${course.duration} ${course.durationType}`} />
                <HeroStat icon={BookOpen} label="Modules" value={course.subjects?.length || 0} />
                <HeroStat icon={Award} label="Certificate" value="Included" />
              </div>
            </div>

            <div className="relative">
              <div className="rounded-2xl overflow-hidden border border-white/15 bg-white/10 p-3 shadow-2xl">
                <img
                  src={courseImage}
                  alt={course.name}
                  className="w-full aspect-[4/3] object-cover rounded-xl bg-slate-200"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2 space-y-6">
            <Reveal>
              <div className="space-y-4">
                {sections.map((section) => {
                  const Icon = section.icon;
                  const isActive = activeSection === section.id;

                  return (
                    <div key={section.id} className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                      <button
                        type="button"
                        onClick={() => setActiveSection(isActive ? '' : section.id)}
                        className={`flex w-full items-center justify-between gap-4 px-5 py-5 text-left font-bold transition-all ${
                          isActive
                            ? 'bg-primary text-white'
                            : 'bg-white text-gray-900 hover:bg-blue-50 hover:text-primary'
                        }`}
                      >
                        <span className="flex items-center gap-3 text-lg">
                          <Icon size={22} />
                          {section.title}
                        </span>
                        {isActive ? (
                          <Minus size={22} className="shrink-0" />
                        ) : (
                          <Plus size={22} className="shrink-0" />
                        )}
                      </button>
                      {isActive && (
                        <div className="border-t border-gray-100 p-5 md:p-7">
                          {section.content}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Reveal>
          </div>

          <div className="lg:col-span-1">
            <Reveal>
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 sticky top-24 space-y-5">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Start This Course</h3>
                  <p className="text-sm text-gray-500 mt-1">Admission ke liye course pre-selected rahega.</p>
                </div>
                <Link to={`/online-admission?courseId=${course._id}`} className="w-full bg-accent hover:bg-orange-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-orange-500/30 transition-all transform hover:-translate-y-1 flex items-center justify-center gap-2">
                  Enroll Now <ArrowRightIcon size={20} />
                </Link>
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <MiniFact icon={Users} label="Guidance" value="Expert Faculty" />
                  <MiniFact icon={GraduationCap} label="Certificate" value="Included" />
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </div>
  );
};

const HeroStat = ({ icon, label, value }) => (
  <div className="rounded-xl border border-white/15 bg-white/10 p-4 backdrop-blur">
    {React.createElement(icon, { size: 20, className: 'text-accent mb-2' })}
    <p className="text-xs uppercase tracking-wide text-blue-100">{label}</p>
    <p className="text-lg font-bold text-white truncate">{value}</p>
  </div>
);

const InfoTile = ({ icon, label, value }) => (
  <div className="rounded-xl border border-gray-100 bg-gray-50 p-5">
    <div className="flex items-center gap-3">
      <div className="p-3 bg-primary/10 text-primary rounded-xl">
        {React.createElement(icon, { size: 22 })}
      </div>
      <div>
        <p className="text-sm text-gray-500 font-semibold uppercase">{label}</p>
        <p className="text-lg font-bold text-gray-900">{value}</p>
      </div>
    </div>
  </div>
);

const MiniFact = ({ icon, label, value }) => (
  <div className="rounded-xl bg-gray-50 p-4 border border-gray-100">
    {React.createElement(icon, { size: 20, className: 'text-primary mb-2' })}
    <p className="text-xs text-gray-500 uppercase font-semibold">{label}</p>
    <p className="text-sm font-bold text-gray-900">{value}</p>
  </div>
);

// Helper Icon for standard bullets
const ArrowRightIcon = ({ className, size }) => (
    <svg 
     xmlns="http://www.w3.org/2000/svg" 
     width={size} 
     height={size} 
     viewBox="0 0 24 24" 
     fill="none" 
     stroke="currentColor" 
     strokeWidth="2" 
     strokeLinecap="round" 
     strokeLinejoin="round" 
     className={className}
    >
        <path d="M5 12h14"></path>
        <path d="m12 5 7 7-7 7"></path>
    </svg>
);

export default CourseDetailPage;
