export const MENU_CONFIG = [
  {
    title: 'Home',
    path: '/home',
    type: 'dropdown',
    subItems: [
      { title: 'Admin Home', path: '/home' },
      { title: 'Teacher Dashboard', path: '/home?tab=teacher-dashboard' },
      { title: 'Dashboard', path: '/dashboard' },
      { title: 'Banner Home', path: '/master/manage-banners' },
      { title: 'Home Sub-Sections', path: '/master/home-sections' },
      { title: 'Group Of Institute Manage', path: '/master/group-institutes' },
      { title: 'Gallery Manage', path: '/master/gallery' }
    ]
  },
  {
    title: 'Master',
    path: '/master',
    type: 'dropdown',
    isCustom: true,
    subItems: [
      { title: 'Student', path: '/master/student' },
      { title: 'Employee', path: '/master/employee' },
       {
        title: 'Academics',
        type: 'nested',
        subItems: [
          { title: 'Batch', path: '/master/batch' },
          { title: 'Course', path: '/master/course' },
          { title: 'Subject', path: '/master/subject' }
        ]
      },
      { title: 'User Rights', path: '/master/user-rights' },
      {
        title: 'Exam',
        type: 'nested',
        subItems: [
          { title: 'Exam Request List', path: '/master/exam-request-list' },
          { title: 'Exam Schedule', path: '/master/exam-schedule' },
          { title: 'Exam Set', path: '/master/exam-set', permissionPage: 'Exam Schedule' },
          { title: 'Exam Student Marks', path: '/master/exam-student-marks', permissionPage: 'Exam Schedule' },
          { title: 'Final Exam Question Paper', path: '/master/final-exam-question-paper', permissionPage: 'Final Exam Question Paper' },
          { title: 'Exam Result', path: '/master/exam-result' }
        ]
      },
      {
        title: 'Learning',
        type: 'nested',
        subItems: [
          { title: 'Material', path: '/master/material' },
          { title: 'Faculty Material', path: '/faculty/material' },
          { title: 'Free Learning', path: '/master/free-learning' }
        ]
      },
      {
        title: 'Syllabus',
        type: 'nested',
        subItems: [
          { title: 'Syllabus Management', path: '/master/syllabus-management', permissionPage: 'Syllabus Management' },
          { title: 'Teacher Subject Management', path: '/master/teacher-subject-management', permissionPage: 'Teacher Subject Management' }
        ]
      },
      { title: 'Manage News', path: '/master/manage-news' },
      { title: 'Topper Result', path: '/master/manage-toppers' },
      { title: 'Our Team', path: '/master/manage-team' }
    ]
  },
  {
    title: 'Transaction',
    path: '/transaction',
    type: 'dropdown',
    isCustom: true, // For special handling if needed, but we try to standardize
    subItems: [
      {
        title: 'Inquiry',
        type: 'nested', // Indicates submenu
        subItems: [
          { title: 'Online', path: '/transaction/inquiry/online' },
          { title: 'Offline', path: '/transaction/inquiry/offline' },
          { title: 'DSR', path: '/transaction/inquiry/dsr' }
        ]
      },
      {
        title: 'Visitors',
        type: 'nested',
        subItems: [
          { title: 'Todays Visitors List', path: '/transaction/visitors/todays-list' },
          { title: 'Activity Visitor Report', path: '/transaction/visitors/todays-report' },
          { title: 'Visitors', path: '/transaction/visitors' }
        ]
      },
      { title: 'Admission', path: '/master/student/new' },
      { title: 'Pending Admission Fees', path: '/transaction/pending-admission-fees' },
      { title: 'Pending Student Registration', path: '/transaction/pending-registration' },
      { title: 'Student Cancellation', path: '/transaction/student-cancellation' },
      // { title: 'Cancelled Students', path: '/transaction/cancelled-students' },
      { title: 'Fees Receipt', path: '/transaction/fees-receipt' },
      { title: 'Expenses', path: '/transaction/expenses' },
      {
        title: 'Attendance',
        type: 'nested',
        subItems: [
          { title: 'Manage Attendance', path: '/transaction/attendance/manage' },
          { title: 'Student Attendance', path: '/transaction/attendance/student' },
          { title: 'Employee Attendance', path: '/transaction/attendance/employee' }
        ]
      }
    ]
  },
  {
    title: 'Reports',
    path: '/reports',
    type: 'dropdown',
    isCustom: true,
    subItems: [
      { title: 'Ledger', path: '/reports/ledger' },
      { 
          title: 'Monthly Report', 
          type: 'nested',
          subItems: [
              { title: 'Student Wise Outstanding', path: '/reports/student-outstanding' },
              { title: 'Student Following Report', path: '/reports/student-following' },
              { title: 'Datewise OutStanding For Students', path: '/reports/datewise-outstanding' }
          ]
      },
      { 
          title: 'Attendance',
          type: 'nested',
          subItems: [
              { title: 'Student Attendance Report', path: '/reports/attendance/student' },
              { title: 'Employee Attendance Report', path: '/reports/attendance/employee' },
          ]
      },
      { 
          title: 'General Report', 
          type: 'nested',
          subItems: [
              // { title: 'Admission Form', path: '/reports/general/admission-form' },
              { title: 'Student Completion Report', path: '/reports/general/student-completion' },
              { title: 'Student Contact Report', path: '/reports/general/student-contact' },
              { title: 'Student Registration Report', path: '/reports/general/student-registration' },
              { title: 'Batch Wise Register', path: '/reports/general/batch-wise-register' },
          ]
      },
      { 
          title: 'Exam Report', 
          type: 'nested',
          subItems: [
              { title: 'Time Table', path: '/reports/exam/time-table' },
              { title: 'Certificate Issue Register', path: '/reports/exam/certificate-issue-register' },
              { title: 'Final Result Details', path: '/reports/exam/final-result-details' },
          ]
      }
    ]
  },
  {
    title: 'Blog',
    path: '/blog',
    type: 'dropdown',
    subItems: [
      { title: 'Manage Blogs', path: '/blog/manage-blogs' }
    ]
  },
  {
    title: 'Connect',
    path: '/connect',
    type: 'dropdown',
    subItems: [
      // { title: 'Video Call', path: '/connect/video-call' },
      // { title: 'Inquiry List', path: '/connect/inquiry-list' },
      { title: 'Feedback & Support', path: '/master/feedback' },
      { title: 'Manage Contacts', path: '/utility/contacts' },
      { title: 'Complain Box', path: '/utility/complains' }
    ]
  },
  {
    title: 'Utility',
    path: '/utility',
    type: 'dropdown',
    isCustom: true,
   subItems: [
  { title: 'Branch', path: '/master/branch', restricted: true },
  { title: 'Location', path: '/utility/location' },
  {
    title: 'External Reference',
    path: '/utility/external-reference',
    permissionPage: 'External Reference',
  },
  { title: 'Manage Terms', path: '/master/manage-terms' },
  { title: 'Cloudinary Management', path: '/utility/cloudinary-manager' },
  { title: 'SMS Station', path: '/utility/sms-station' },
  // { title: 'Downloads', path: '/utility/downloads' },
]
  }
];

// Helper to flatten menu for User Rights table
// Returns object: { 'Master': ['Student', 'Employee'...], 'Transaction': ['Inquiry - Online', 'Inquiry - Offline'...] }
export const getMenuSections = () => {
    const sections = {};
    
    MENU_CONFIG.forEach(item => {
        // Handle "Home" or other single types that might have subItems for rights purposes
        if ((item.type === 'dropdown' || item.type === 'single') && item.subItems) {
            const pageNames = [];
            
            item.subItems.forEach(sub => {
                if (sub.restricted) return; // Skip restricted items

                if (sub.type === 'nested' && sub.subItems) {
                    // Flatten nested items: "Inquiry - Online"
                    sub.subItems.forEach(nestedSub => {
                        if (nestedSub.restricted) return;
                        pageNames.push(nestedSub.permissionPage || `${sub.title} - ${nestedSub.title}`);
                    });
                } else {
                    pageNames.push(sub.title);
                    
                    // Specific Handling for Admin Home Granular Rights
                    if (sub.title === 'Admin Home') {
                        pageNames.push('Admin Home - Inquiry List');
                        pageNames.push('Admin Home - Online Admissions');
                        pageNames.push('Admin Home - Exam Pending List');
                    }
                }
            });
            
            if (pageNames.length > 0) {
                // If it's Home, we might want to group it separately or just add to sections
                sections[item.title] = [...new Set(pageNames)];
            }
        }
    });

    // Add Reference Incentive to the Home section (or create if not exists)
    if (sections['Home']) {
        if (!sections['Home'].includes('Reference Incentive')) {
            sections['Home'].push('Reference Incentive');
        }
    } else {
        sections['Home'] = ['Reference Incentive'];
    }
    
    return sections;
};

// Helper to get flatten permissions list for default state
export const getAllPermissionPages = () => {
    const sections = getMenuSections();
    return Object.values(sections).flat();
};

