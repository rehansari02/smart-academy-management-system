import React, { Suspense, lazy } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { useSelector } from "react-redux";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Layout
import Navbar from "./components/layout/Navbar";
import PublicLayout from "./components/layout/PublicLayout";
import StudentLayout from "./components/layout/StudentLayout";
import ScrollToTop from "./components/layout/ScrollToTop";
import Loading from "./components/Loading"; // Import Loading Component

// Pages
const HomePage = lazy(() => import("./pages/HomePage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const StudentLoginPage = lazy(() => import("./pages/StudentLoginPage"));
const AdminHome = lazy(() => import("./pages/admin/AdminHome"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AboutUsPage = lazy(() => import("./pages/user/AboutUsPage"));
const WhySmartPage = lazy(() => import("./pages/user/WhySmartPage"));
const CoursePage = lazy(() => import("./pages/user/CoursePage"));
const CourseDetailPage = lazy(() => import("./pages/user/CourseDetailPage"));
const FacilitiesPage = lazy(() => import("./pages/user/FacilitiesPage"));
const GalleryPage = lazy(() => import("./pages/user/GalleryPage"));
const FranchisePage = lazy(() => import("./pages/user/FranchisePage"));
const ContactPage = lazy(() => import("./pages/user/ContactPage"));
const BlogPage = lazy(() => import("./pages/user/BlogPage"));
const NewsPage = lazy(() => import("./pages/user/NewsPage"));
const FeedbackPage = lazy(() => import("./pages/user/FeedbackPage"));
const OnlineAdmission = lazy(() => import("./pages/user/OnlineAdmission"));
const TermsAndConditions = lazy(() => import("./pages/user/TermsAndConditions"));
const VerifyStudent = lazy(() => import("./pages/user/VerifyStudent"));
const PublicResultView = lazy(() => import("./pages/user/PublicResultView"));
const OurTeamPage = lazy(() => import("./pages/user/OurTeamPage"));

// Student Pages
const StudentHome = lazy(() => import("./pages/student/StudentHome"));
const StudentCourseDetail = lazy(() => import("./pages/student/CourseDetail"));
const StudentCourseFeedback = lazy(() => import("./pages/student/CourseFeedback"));
const StudentFreeStudyMaterial = lazy(() => import("./pages/student/FreeStudyMaterial"));
const MaterialPreview = lazy(() => import("./pages/MaterialPreview"));
const StudentFreeLearning = lazy(() => import("./pages/student/FreeLearning"));
const StudentFreeLearningReport = lazy(() => import("./pages/student/FreeLearningReport"));
const StudentFees = lazy(() => import("./pages/student/StudentFees"));
const StudentExamSchedule = lazy(() => import("./pages/student/ExamSchedule"));
const StudentExamConduct = lazy(() => import("./pages/student/ExamConduct"));
const StudentExamAttempt = lazy(() => import("./pages/student/ExamAttempt"));
const StudentComplain = lazy(() => import("./pages/student/Complain"));
const StudentSyllabus = lazy(() => import("./pages/student/Syllabus"));


// Master Pages
const StudentList = lazy(() => import("./pages/admin/master/StudentList"));
const StudentAdmission = lazy(() =>
  import("./pages/admin/master/StudentAdmission")
);
const StudentUpdate = lazy(() => import("./pages/admin/master/StudentUpdate"));
const StudentProfile = lazy(() =>
  import("./pages/admin/master/StudentProfile")
);
const CourseMaster = lazy(() => import("./pages/admin/master/CourseMaster"));
const CourseFormPage = lazy(() => import("./pages/admin/master/CourseFormPage"));
const PopularCourseMaster = lazy(() => import("./pages/admin/master/PopularCourseMaster"));
const BatchMaster = lazy(() => import("./pages/admin/master/BatchMaster"));
const EmployeeMaster = lazy(() =>
  import("./pages/admin/master/EmployeeMaster")
);
const SubjectMaster = lazy(() => import("./pages/admin/master/SubjectMaster"));
const UserRights = lazy(() => import("./pages/admin/master/UserRights"));
const ExamRequestList = lazy(() =>
  import("./pages/admin/master/ExamRequestList")
);
const ExamSchedule = lazy(() => import("./pages/admin/master/ExamSchedule"));
const ExamSet = lazy(() => import("./pages/admin/master/ExamSet"));
const ExamSetAbsent = lazy(() => import("./pages/admin/master/ExamSetAbsent"));
const ExamStudentMarks = lazy(() => import("./pages/admin/master/ExamStudentMarks"));
const ExamStudentMarksDetail = lazy(() => import("./pages/admin/master/ExamStudentMarksDetail"));
const FinalExamQuestionPaper = lazy(() => import("./pages/admin/master/FinalExamQuestionPaper"));
const AddFinalExamQuestionPaper = lazy(() => import("./pages/admin/master/AddFinalExamQuestionPaper"));
const FinalExamQuestionPaperSubjects = lazy(() => import("./pages/admin/master/FinalExamQuestionPaperSubjects"));
const ViewFinalExamQuestionPaper = lazy(() => import("./pages/admin/master/ViewFinalExamQuestionPaper"));
const ExamResult = lazy(() => import("./pages/admin/master/ExamResult"));
const AddEditExamResult = lazy(() => import("./pages/admin/master/AddEditExamResult"));
const ManageNews = lazy(() => import('./pages/admin/master/ManageNews'));
const ManageToppers = lazy(() => import('./pages/admin/master/ManageToppers'));
const ManageTerms = lazy(() => import("./pages/admin/master/ManageTerms"));
const ManageBanners = lazy(() => import("./pages/admin/master/ManageBanners"));
const ManageHomeSections = lazy(() => import("./pages/admin/master/ManageHomeSections"));
const ManageGroupInstitutes = lazy(() => import("./pages/admin/master/ManageGroupInstitutes"));
const ManageGallery = lazy(() => import("./pages/admin/master/ManageGallery"));
const ManageFeedback = lazy(() => import("./pages/admin/master/ManageFeedback"));
const BranchMaster = lazy(() => import("./pages/admin/master/BranchMaster"));
const Material = lazy(() => import("./pages/admin/master/Material"));
const FacultyMaterial = lazy(() => import("./pages/admin/FacultyMaterial"));
const FreeLearning = lazy(() => import("./pages/admin/master/FreeLearning"));
const ManageFreeLearning = lazy(() => import("./pages/admin/master/ManageFreeLearning"));
const ReferenceIncentive = lazy(() => import("./pages/admin/master/ReferenceIncentive"));
const ReferenceChart = lazy(() => import("./pages/admin/master/ReferenceChart"));
const ManageTeam = lazy(() => import("./pages/admin/master/ManageTeam"));
const CloudinaryManager = lazy(() => import("./pages/admin/utility/CloudinaryManager"));
const LocationMaster = lazy(() => import("./pages/admin/utility/LocationMaster"));
const SmsStation = lazy(() => import("./pages/admin/utility/SmsStation"));
const ManageContact = lazy(() => import("./pages/admin/utility/ManageContact"));
const ComplainManagement = lazy(() => import("./pages/admin/utility/ComplainManagement"));
const SyllabusManagement = lazy(() => import("./pages/admin/utility/SyllabusManagement"));
const TeacherSubjectManagement = lazy(() => import("./pages/admin/utility/TeacherSubjectManagement"));
const ExternalReference = lazy(() => import("./pages/admin/utility/ExternalReference"));

// Transaction Pages
const InquiryPage = lazy(() => import("./pages/admin/transaction/InquiryPage"));
const FeeCollection = lazy(() =>
  import("./pages/admin/transaction/FeeCollection")
);
const AllReceipts = lazy(() => import("./pages/admin/transaction/AllReceipts"));
const InquiryOnline = lazy(() =>
  import("./pages/admin/transaction/InquiryOnline")
);
const InquiryOffline = lazy(() =>
  import("./pages/admin/transaction/InquiryOffline")
);
const InquiryDSR = lazy(() => import("./pages/admin/transaction/InquiryDSR"));
const TodaysVisitorsList = lazy(() =>
  import("./pages/admin/transaction/TodaysVisitorsList")
);
const TodaysVisitedReport = lazy(() =>
  import("./pages/admin/transaction/TodaysVisitedReport")
);
const Visitors = lazy(() => import("./pages/admin/transaction/Visitors"));
const PendingAdmissionFees = lazy(() =>
  import("./pages/admin/transaction/PendingAdmissionFees")
);
const PendingAdmissionFeePayment = lazy(() =>
  import("./pages/admin/transaction/PendingAdmissionFeePayment")
);
const StudentCancellation = lazy(() =>
  import("./pages/admin/transaction/StudentCancellation")
);
const CancelledStudents = lazy(() =>
  import("./pages/admin/transaction/CancelledStudents")
);
const PendingStudentRegistration = lazy(() =>
  import("./pages/admin/transaction/PendingStudentRegistration")
);
const StudentRegistrationProcess = lazy(() =>
  import("./pages/admin/transaction/StudentRegistrationProcess")
);
const StudentAttendance = lazy(() => import("./pages/admin/transaction/StudentAttendance"));
const EmployeeAttendance = lazy(() => import("./pages/admin/transaction/EmployeeAttendance"));
const ManageAttendance = lazy(() => import("./pages/admin/transaction/ManageAttendance"));
const Expenses = lazy(() => import("./pages/admin/transaction/Expenses"));
const ExpenseCategories = lazy(() => import("./pages/admin/transaction/ExpenseCategories"));

// --- BLOG ---
const ManageBlogs = lazy(() => import("./pages/admin/blog/ManageBlogs"));
const BlogDetail = lazy(() => import("./pages/user/BlogDetail"));

// --- REPORTS (Ensure this import is correct) ---
const LedgerReport = lazy(() => import("./pages/admin/reports/LedgerReport"));
const StudentWiseOutstanding = lazy(() => import("./pages/admin/reports/StudentWiseOutstanding"));
const AdmissionFormPrint = lazy(() => import("./pages/admin/reports/AdmissionFormPrint"));
const EmployeeJoiningPrint = lazy(() => import("./pages/admin/reports/EmployeeJoiningPrint"));
const StudentFollowingReport = lazy(() => import("./pages/admin/reports/StudentFollowingReport"));
const DatewiseOutstandingReport = lazy(() => import('./pages/admin/reports/DatewiseOutstandingReport'));
const StudentAttendanceReport = lazy(() => import('./pages/admin/reports/StudentAttendanceReport'));
const EmployeeAttendanceReport = lazy(() => import('./pages/admin/reports/EmployeeAttendanceReport'));
const BlankAdmissionForm = lazy(() => import('./pages/admin/reports/BlankAdmissionForm'));
const StudentCompletionReport = lazy(() => import('./pages/admin/reports/StudentCompletionReport'));
const StudentContactReport = lazy(() => import('./pages/admin/reports/StudentContactReport'));
const StudentRegistrationReport = lazy(() => import('./pages/admin/reports/StudentRegistrationReport'));
const BatchWiseRegister = lazy(() => import('./pages/admin/reports/BatchWiseRegister'));
const ExamResultPrint = lazy(() => import('./pages/admin/reports/ExamResultPrint'));
const TimeTableReport = lazy(() => import('./pages/admin/reports/TimeTableReport'));
const CertificateIssueRegister = lazy(() => import('./pages/admin/reports/CertificateIssueRegister'));
const FinalResultDetails = lazy(() => import('./pages/admin/reports/FinalResultDetails'));

const PrivateRoute = ({ children }) => {
  const { user } = useSelector((state) => state.auth);
  return user ? children : <Navigate to="/login" />;
};

const SuperAdminRoute = ({ children }) => {
  const { user } = useSelector((state) => state.auth);

  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'Student') return <Navigate to="/student/home" replace />;
  if (user.role !== 'Super Admin' && user.type !== 'Super Admin') return <Navigate to="/home" replace />;

  return children;
};

function App() {
  const { user } = useSelector((state) => state.auth);

  const getHomeRoute = () => {
    if (!user) return "/";
    if (user.role === 'Student') return "/student/home";
    return "/home";
  };

  return (
    <>
      <Router>
        <ScrollToTop />
        <div
          className={`min-h-screen bg-gray-50 text-gray-900 font-sans ${
            user ? "pt-20 print:pt-0" : ""
          }`}
        >
          {/* Admin Navbar - Show only if user is logged in AND NOT A STUDENT */}
          <div className="print:hidden">{user && user.role !== 'Student' && <Navbar />}</div>
          
          <Suspense fallback={<Loading />}>
            <Routes>
              
              {/* STUDENT ROUTES */}
              <Route path="/student" element={<PrivateRoute><StudentLayout /></PrivateRoute>}>
                 <Route index element={<Navigate to="home" replace />} />
                 <Route path="home" element={<StudentHome />} />
                 <Route path="course-detail" element={<StudentCourseDetail />} />
                 <Route path="course-feedback" element={<StudentCourseFeedback />} />
                 <Route path="syllabus" element={<StudentSyllabus />} />
                 
                 {/* Study Section */}
                 <Route path="study/materials" element={<StudentFreeStudyMaterial />} />
                 <Route path="study/free-learning" element={<StudentFreeLearning />} />
                 <Route path="study/free-learning-report" element={<StudentFreeLearningReport />} />
                 
                 <Route path="fees" element={<StudentFees />} />
                 <Route path="exam-schedule" element={<StudentExamSchedule />} />
                 <Route path="exam" element={<StudentExamConduct />} />
                 <Route path="exam/:scheduleId/:subjectId" element={<StudentExamAttempt />} />
                 <Route path="complain" element={<StudentComplain />} />

                 <Route path="*" element={<Navigate to="home" replace />} />
              </Route>


              {/* PRIVATE ADMIN ROUTES */}
              <Route
                path="/home"
                element={
                  <PrivateRoute>
                     {user?.role === 'Student' ? <Navigate to="/student/home" /> : <AdminHome />}
                  </PrivateRoute>
                }
              />
              <Route
                path="/dashboard"
                element={
                  <PrivateRoute>
                    <AdminDashboard />
                  </PrivateRoute>
                }
              />

              {/* MASTER ROUTES */}
              <Route
                path="/master/student"
                element={
                  <PrivateRoute>
                    <StudentList />
                  </PrivateRoute>
                }
              />
              <Route
                path="/master/student/new"
                element={
                  <PrivateRoute>
                    <StudentAdmission />
                  </PrivateRoute>
                }
              />
              <Route
                path="/master/student/edit/:id"
                element={
                  <PrivateRoute>
                    <StudentUpdate />
                  </PrivateRoute>
                }
              />
              <Route
                path="/master/student/view/:id"
                element={
                  <PrivateRoute>
                    <StudentProfile />
                  </PrivateRoute>
                }
              />
              <Route
                path="/master/course"
                element={
                  <PrivateRoute>
                    <CourseMaster />
                  </PrivateRoute>
                }
              />
              <Route
                path="/master/course/new"
                element={
                  <PrivateRoute>
                    <CourseFormPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/master/course/edit/:id"
                element={
                  <PrivateRoute>
                    <CourseFormPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/master/popular-courses"
                element={
                  <PrivateRoute>
                    <PopularCourseMaster />
                  </PrivateRoute>
                }
              />
              <Route
                path="/master/batch"
                element={
                  <PrivateRoute>
                    <BatchMaster />
                  </PrivateRoute>
                }
              />
              <Route
                path="/master/subject"
                element={
                  <PrivateRoute>
                    <SubjectMaster />
                  </PrivateRoute>
                }
              />
              <Route
                path="/master/employee"
                element={
                  <PrivateRoute>
                    <EmployeeMaster />
                  </PrivateRoute>
                }
              />
              <Route
                path="/master/user-rights"
                element={
                  <PrivateRoute>
                    <UserRights />
                  </PrivateRoute>
                }
              />
              <Route
                path="/master/exam-request-list"
                element={
                  <PrivateRoute>
                    <ExamRequestList />
                  </PrivateRoute>
                }
              />
              <Route
                path="/master/exam-schedule"
                element={
                  <PrivateRoute>
                    <ExamSchedule />
                  </PrivateRoute>
                }
              />
              <Route
                path="/master/exam-set"
                element={
                  <PrivateRoute>
                    <ExamSet />
                  </PrivateRoute>
                }
              />
              <Route
                path="/master/exam-set/absent"
                element={
                  <PrivateRoute>
                    <ExamSetAbsent />
                  </PrivateRoute>
                }
              />
              <Route
                path="/master/exam-student-marks"
                element={
                  <PrivateRoute>
                    <ExamStudentMarks />
                  </PrivateRoute>
                }
              />
              <Route
                path="/master/exam-student-marks/:attemptId"
                element={
                  <PrivateRoute>
                    <ExamStudentMarksDetail />
                  </PrivateRoute>
                }
              />

              <Route
                path="/master/final-exam-question-paper"
                element={
                  <PrivateRoute>
                    <FinalExamQuestionPaper />
                  </PrivateRoute>
                }
              />
              <Route
                path="/master/final-exam-question-paper/add"
                element={
                  <PrivateRoute>
                    <AddFinalExamQuestionPaper />
                  </PrivateRoute>
                }
              />
              <Route
                path="/master/final-exam-question-paper/subjects/:id"
                element={
                  <PrivateRoute>
                    <FinalExamQuestionPaperSubjects />
                  </PrivateRoute>
                }
              />
              <Route
                path="/master/final-exam-question-paper/view/:id"
                element={
                  <PrivateRoute>
                    <ViewFinalExamQuestionPaper />
                  </PrivateRoute>
                }
              />
              <Route
                path="/master/exam-result"
                element={
                  <PrivateRoute>
                    <ExamResult />
                  </PrivateRoute>
                }
              />
              <Route
                path="/master/exam-result/add"
                element={
                  <PrivateRoute>
                    <AddEditExamResult />
                  </PrivateRoute>
                }
              />
              <Route
                path="/master/exam-result/edit/:id"
                element={
                  <PrivateRoute>
                    <AddEditExamResult />
                  </PrivateRoute>
                }
              />
              <Route
                path="/master/manage-news"
                element={
                  <PrivateRoute>
                    <ManageNews />
                  </PrivateRoute>
                }
              />
              <Route
                path="/master/manage-toppers"
                element={
                  <PrivateRoute>
                    <ManageToppers />
                  </PrivateRoute>
                }
              />
               <Route
                path="/master/manage-terms"
                element={
                  <PrivateRoute>
                    <ManageTerms />
                  </PrivateRoute>
                }
              />
              <Route
                path="/master/manage-banners"
                element={
                  <PrivateRoute>
                    <ManageBanners />
                  </PrivateRoute>
                }
              />
              <Route path="/master/home-sections" element={<PrivateRoute><ManageHomeSections /></PrivateRoute>} />
              <Route path="/master/group-institutes" element={<PrivateRoute><ManageGroupInstitutes /></PrivateRoute>} />
              <Route path="/master/gallery" element={<PrivateRoute><ManageGallery /></PrivateRoute>} />
              <Route path="/master/feedback" element={<PrivateRoute><ManageFeedback /></PrivateRoute>} />
              <Route
                path="/reference-incentive"
                element={
                  <PrivateRoute>
                    <ReferenceIncentive />
                  </PrivateRoute>
                }
              />
              <Route
                path="/reference-chart"
                element={
                  <SuperAdminRoute>
                    <ReferenceChart />
                  </SuperAdminRoute>
                }
              />
              <Route
                path="/master/branch"
                element={
                  <PrivateRoute>
                    <BranchMaster />
                  </PrivateRoute>
                }
              />
              <Route
                path="/master/material"
                element={
                  <PrivateRoute>
                    <Material />
                  </PrivateRoute>
                }
              />
              <Route
                path="/faculty/material"
                element={
                  <PrivateRoute>
                    <FacultyMaterial />
                  </PrivateRoute>
                }
              />
              <Route
                path="/master/free-learning"
                element={
                  <PrivateRoute>
                    <FreeLearning />
                  </PrivateRoute>
                }
              />
              <Route
                path="/master/free-learning/manage"
                element={
                  <PrivateRoute>
                    <ManageFreeLearning />
                  </PrivateRoute>
                }
              />
              <Route
                path="/master/manage-team"
                element={
                  <PrivateRoute>
                    <ManageTeam />
                  </PrivateRoute>
                }
              />

              {/* TRANSACTION ROUTES */}
              <Route
                path="/transaction/inquiry"
                element={
                  <PrivateRoute>
                    <InquiryPage />
                  </PrivateRoute>
                }
              />
                <Route
                path="/transaction/fees-receipt"
                element={
                  <PrivateRoute>
                    <FeeCollection />
                  </PrivateRoute>
                }
              />
              <Route
                path="/transaction/all-receipts"
                element={
                  <PrivateRoute>
                    <AllReceipts />
                  </PrivateRoute>
                }
              />
              <Route
                path="/transaction/inquiry/online"
                element={
                  <PrivateRoute>
                    <InquiryOnline />
                  </PrivateRoute>
                }
              />
              <Route
                path="/transaction/inquiry/offline"
                element={
                  <PrivateRoute>
                    <InquiryOffline />
                  </PrivateRoute>
                }
              />
              <Route
                path="/transaction/inquiry/dsr"
                element={
                  <PrivateRoute>
                    <InquiryDSR />
                  </PrivateRoute>
                }
              />
              <Route
                path="/transaction/visitors/todays-list"
                element={
                  <PrivateRoute>
                    <TodaysVisitorsList />
                  </PrivateRoute>
                }
              />
              <Route
                path="/transaction/visitors/todays-report"
                element={
                  <PrivateRoute>
                    <TodaysVisitedReport />
                  </PrivateRoute>
                }
              />
              <Route
                path="/transaction/visitors"
                element={
                  <PrivateRoute>
                    <Visitors />
                  </PrivateRoute>
                }
              />
              <Route
                path="/transaction/pending-admission-fees"
                element={
                  <PrivateRoute>
                    <PendingAdmissionFees />
                  </PrivateRoute>
                }
              />
              <Route
                path="/transaction/admission-payment/:id"
                element={
                  <PrivateRoute>
                    <PendingAdmissionFeePayment />
                  </PrivateRoute>
                }
              />

              <Route
                path="/transaction/student-registration"
                element={
                  <PrivateRoute>
                    <StudentAdmission />
                  </PrivateRoute>
                }
              />
              <Route
                path="/transaction/student-cancellation"
                element={
                  <PrivateRoute>
                    <StudentCancellation />
                  </PrivateRoute>
                }
              />
              <Route
                path="/transaction/cancelled-students"
                element={
                  <PrivateRoute>
                    <CancelledStudents />
                  </PrivateRoute>
                }
              />
              <Route
                path="/transaction/pending-registration"
                element={
                  <PrivateRoute>
                    <PendingStudentRegistration />
                  </PrivateRoute>
                }
              />
              <Route
                path="/transaction/student-registration-process/:id"
                element={
                  <PrivateRoute>
                    <StudentRegistrationProcess />
                  </PrivateRoute>
                }
              />
              <Route
                path="/transaction/attendance/manage"
                element={
                  <PrivateRoute>
                    <ManageAttendance />
                  </PrivateRoute>
                }
              />
              <Route
                path="/transaction/attendance/student"
                element={
                  <PrivateRoute>
                    <StudentAttendance />
                  </PrivateRoute>
                }
              />
               <Route
                path="/transaction/attendance/employee"
                element={
                  <PrivateRoute>
                    <EmployeeAttendance />
                  </PrivateRoute>
                }
              />
              <Route
                path="/transaction/expenses"
                element={
                  <PrivateRoute>
                    <Suspense fallback={<Loading />}>
                        <Expenses />
                    </Suspense>
                  </PrivateRoute>
                }
              />
              <Route
                path="/transaction/expense-categories"
                element={
                  <PrivateRoute>
                    <Suspense fallback={<Loading />}>
                        <ExpenseCategories />
                    </Suspense>
                  </PrivateRoute>
                }
              />

              {/* --- REPORTS ROUTE --- */}
              <Route
                path="/reports/ledger"
                element={
                  <PrivateRoute>
                    <LedgerReport />
                  </PrivateRoute>
                }
              />
              <Route
                path="/reports/student-outstanding"
                element={
                  <PrivateRoute>
                    <StudentWiseOutstanding />
                  </PrivateRoute>
                }
              />
              <Route
                path="/reports/student-following"
                element={
                  <PrivateRoute>
                    <StudentFollowingReport />
                  </PrivateRoute>
                }
              />
              <Route
                path="/reports/datewise-outstanding"
                element={
                  <PrivateRoute>
                    <DatewiseOutstandingReport />
                  </PrivateRoute>
                }
              />
              <Route
                path="/reports/attendance/student"
                element={
                  <PrivateRoute>
                    <StudentAttendanceReport />
                  </PrivateRoute>
                }
              />
              <Route
                path="/reports/attendance/employee"
                element={
                  <PrivateRoute>
                    <EmployeeAttendanceReport />
                  </PrivateRoute>
                }
              />
              <Route
                path="/reports/general/admission-form"
                element={
                  <PrivateRoute>
                    <BlankAdmissionForm />
                  </PrivateRoute>
                }
              />
              <Route
                path="/reports/general/student-completion"
                element={
                  <PrivateRoute>
                    <StudentCompletionReport />
                  </PrivateRoute>
                }
              />
              <Route
                path="/reports/general/student-contact"
                element={
                  <PrivateRoute>
                    <StudentContactReport />
                  </PrivateRoute>
                }
              />
              <Route
                path="/reports/general/student-registration"
                element={
                  <PrivateRoute>
                    <StudentRegistrationReport />
                  </PrivateRoute>
                }
              />
              <Route
                path="/reports/general/batch-wise-register"
                element={
                  <PrivateRoute>
                    <BatchWiseRegister />
                  </PrivateRoute>
                }
              />
              <Route
                path="/reports/exam/time-table"
                element={
                  <PrivateRoute>
                    <TimeTableReport />
                  </PrivateRoute>
                }
              />
              <Route
                path="/reports/exam/certificate-issue-register"
                element={
                  <PrivateRoute>
                    <CertificateIssueRegister />
                  </PrivateRoute>
                }
              />
              <Route
                path="/reports/exam/final-result-details"
                element={
                  <PrivateRoute>
                    <FinalResultDetails />
                  </PrivateRoute>
                }
              />
              <Route
                path="/print/admission-form/:id"
                element={
                  <PrivateRoute>
                    <Suspense fallback={<Loading />}>
                        {/* Lazy load inline or import at top if preferred, using existing lazy pattern */}
                        <AdmissionFormPrint />
                    </Suspense>
                  </PrivateRoute>
                }
              />
              
              <Route
                path="/print/employee-joining"
                element={
                  <PrivateRoute>
                    <Suspense fallback={<Loading />}>
                        <EmployeeJoiningPrint />
                    </Suspense>
                  </PrivateRoute>
                }
              />

              <Route
                path="/print/exam-result/:id"
                element={
                  <PrivateRoute>
                    <Suspense fallback={<Loading />}>
                        <ExamResultPrint />
                    </Suspense>
                  </PrivateRoute>
                }
              />
              
              <Route
                path="/master/syllabus-management"
                element={
                  <PrivateRoute>
                    <Suspense fallback={<Loading />}>
                        <SyllabusManagement />
                    </Suspense>
                  </PrivateRoute>
                }
              />
              <Route
                path="/master/syllabus-management/report/:reportBranchId/:reportBatchId/:reportCourseId/:reportSubjectId/:reportStudentId"
                element={
                  <PrivateRoute>
                    <Suspense fallback={<Loading />}>
                        <SyllabusManagement />
                    </Suspense>
                  </PrivateRoute>
                }
              />
              <Route
                path="/master/syllabus-management/report/:reportSubjectId/:reportStudentId"
                element={
                  <PrivateRoute>
                    <Suspense fallback={<Loading />}>
                        <SyllabusManagement />
                    </Suspense>
                  </PrivateRoute>
                }
              />
              <Route
                path="/master/syllabus-management/:subjectId/edit"
                element={
                  <PrivateRoute>
                    <Suspense fallback={<Loading />}>
                        <SyllabusManagement />
                    </Suspense>
                  </PrivateRoute>
                }
              />
              <Route
                path="/master/syllabus-management/:branchId"
                element={
                  <PrivateRoute>
                    <Suspense fallback={<Loading />}>
                        <SyllabusManagement />
                    </Suspense>
                  </PrivateRoute>
                }
              />
              <Route
                path="/master/syllabus-management/:branchId/:batchId"
                element={
                  <PrivateRoute>
                    <Suspense fallback={<Loading />}>
                        <SyllabusManagement />
                    </Suspense>
                  </PrivateRoute>
                }
              />
              <Route
                path="/master/syllabus-management/:branchId/:batchId/:courseId"
                element={
                  <PrivateRoute>
                    <Suspense fallback={<Loading />}>
                        <SyllabusManagement />
                    </Suspense>
                  </PrivateRoute>
                }
              />
              <Route
                path="/master/syllabus-management/:branchId/:batchId/:courseId/:subjectId/students"
                element={
                  <PrivateRoute>
                    <Suspense fallback={<Loading />}>
                        <SyllabusManagement />
                    </Suspense>
                  </PrivateRoute>
                }
              />
              <Route
                path="/master/syllabus-management/:branchId/:batchId/:courseId/:subjectId/students/:studentId"
                element={
                  <PrivateRoute>
                    <Suspense fallback={<Loading />}>
                        <SyllabusManagement />
                    </Suspense>
                  </PrivateRoute>
                }
              />
              <Route
                path="/master/syllabus-management/:branchId/:batchId/:courseId/:subjectId/edit"
                element={
                  <PrivateRoute>
                    <Suspense fallback={<Loading />}>
                        <SyllabusManagement />
                    </Suspense>
                  </PrivateRoute>
                }
              />
              <Route
                path="/master/teacher-subject-management"
                element={
                  <PrivateRoute>
                    <Suspense fallback={<Loading />}>
                        <TeacherSubjectManagement />
                    </Suspense>
                  </PrivateRoute>
                }
              />
              <Route
                path="/utility/syllabus-management/*"
                element={<Navigate to="/master/syllabus-management" replace />}
              />
              <Route
                path="/utility/teacher-subject-management"
                element={<Navigate to="/master/teacher-subject-management" replace />}
              />
              <Route
                path="/utility/cloudinary-manager"
                element={
                  <PrivateRoute>
                    <Suspense fallback={<Loading />}>
                        <CloudinaryManager />
                    </Suspense>
                  </PrivateRoute>
                }
              />
              <Route
                path="/utility/location"
                element={
                  <PrivateRoute>
                    <Suspense fallback={<Loading />}>
                        <LocationMaster />
                    </Suspense>
                  </PrivateRoute>
                }
              />
              <Route
                path="/utility/external-reference"
                element={
                  <PrivateRoute>
                    <Suspense fallback={<Loading />}>
                        <ExternalReference />
                    </Suspense>
                  </PrivateRoute>
                }
              />
              <Route
                path="/utility/sms-station"
                element={
                  <PrivateRoute>
                    <Suspense fallback={<Loading />}>
                        <SmsStation />
                    </Suspense>
                  </PrivateRoute>
                }
              />
              <Route
                path="/utility/contacts"
                element={
                  <PrivateRoute>
                    <Suspense fallback={<Loading />}>
                        <ManageContact />
                    </Suspense>
                  </PrivateRoute>
                }
              />
              <Route
                path="/utility/complains"
                element={
                  <PrivateRoute>
                    <Suspense fallback={<Loading />}>
                        <ComplainManagement />
                    </Suspense>
                  </PrivateRoute>
                }
              />

              {/* Connect */}
              <Route
                path="/connect/inquiry-list"
                element={
                  <PrivateRoute>
                    <InquiryPage />
                  </PrivateRoute>
                }
              />

              {/* Blog Management */}
              <Route
                path="/blog/manage-blogs"
                element={
                  <PrivateRoute>
                    <Suspense fallback={<Loading />}>
                      <ManageBlogs />
                    </Suspense>
                  </PrivateRoute>
                }
              />

              <Route
                path="/master/employee"
                element={
                  <PrivateRoute>
                      <EmployeeMaster />
                  </PrivateRoute>
                }
              />

              {/* PUBLIC PAGES */}
              <Route
                path="/login"
                element={user ? <Navigate to={getHomeRoute()} replace /> : <LoginPage />}
              />
              <Route
                path="/student-login"
                element={user ? <Navigate to={getHomeRoute()} replace /> : <StudentLoginPage />}
              />
              <Route
                path="/register-admin-zyx"
                element={
                  user ? <Navigate to={getHomeRoute()} replace /> : <RegisterPage />
                }
              />

              <Route path="/material-preview/:id" element={<MaterialPreview />} />

              <Route element={<PublicLayout />}>
                <Route
                  path="/"
                  element={
                    user ? <Navigate to={getHomeRoute()} replace /> : <HomePage />
                  }
                />
                <Route path="/about-us" element={<AboutUsPage />} />
                <Route path="/why-smart" element={<WhySmartPage />} />
                <Route path="/course" element={<CoursePage />} />
                <Route
                  path="/course/:courseId"
                  element={<CourseDetailPage />}
                />
                <Route path="/facilities" element={<FacilitiesPage />} />
                <Route path="/gallery" element={<GalleryPage />} />
                <Route path="/our-team" element={<OurTeamPage />} />
                <Route path="/franchise" element={<FranchisePage />} />
                <Route path="/contact" element={<ContactPage />} />
                <Route path="/news" element={<NewsPage />} />
                <Route path="/blog" element={<BlogPage />} />
                <Route path="/blog/:slug" element={<BlogDetail />} />
                <Route path="/feedback" element={<FeedbackPage />} />
                <Route path="/online-admission" element={<OnlineAdmission />} />
                <Route path="/terms-and-conditions" element={<TermsAndConditions />} />
                <Route path="/verify-student" element={<VerifyStudent />} />
                <Route path="/result" element={<PublicResultView />} />
              </Route>
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </Suspense>
        </div>
      </Router>
      <ToastContainer position="top-right" autoClose={3000} theme="light" />
    </>
  );
}

export default App;





