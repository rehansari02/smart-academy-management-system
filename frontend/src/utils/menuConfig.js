export const MENU_CONFIG = [
  {
    title: 'Home',
    path: '/home',
    type: 'single', // For sidebar
    subItems: [{ title: 'Admin Home', path: '/admin-dashboard' }] // Added for User Rights mapping (see getMenuSections)
  },
  {
    title: 'Master',
    path: '/master',
    type: 'dropdown',
    subItems: [
      { title: 'Student', path: '/master/student' },
      { title: 'Employee', path: '/master/employee' },
      { title: 'Batch', path: '/master/batch' },
      { title: 'Course', path: '/master/course' },
      { title: 'Subject', path: '/master/subject' },
      { title: 'Exam Request List', path: '/master/exam-request-list' },
      { title: 'Exam Schedule', path: '/master/exam-schedule' },
      { title: 'Exam Result', path: '/master/exam-result' },
      { title: 'User Rights', path: '/master/user-rights' },
      { title: 'Material', path: '/master/material' },
      { title: 'Free Learning', path: '/master/free-learning' },
      { title: 'Manage News', path: '/master/manage-news' },
      { title: 'Topper Result', path: '/master/manage-toppers' }
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
          { title: 'Todays Visited Report', path: '/transaction/visitors/todays-report' },
          { title: 'Visitors', path: '/transaction/visitors' }
        ]
      },
      { title: 'Admission', path: '/master/student/new' },
      { title: 'Pending Admission Fees', path: '/transaction/pending-admission-fees' },
      { title: 'Pending Student Registration', path: '/transaction/pending-registration' },
      { title: 'Student Cancellation', path: '/transaction/student-cancellation' },
      { title: 'Fees Receipt', path: '/transaction/fees-receipt' },
      {
        title: 'Attendance',
        type: 'nested',
        subItems: [
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
              { title: 'Admission Form', path: '/reports/general/admission-form' },
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
      { title: 'Video Call', path: '/connect/video-call' },
      { title: 'Inquiry List', path: '/connect/inquiry-list' }
    ]
  },
  {
    title: 'Utility',
    path: '/utility',
    type: 'dropdown',
    subItems: [
      { title: 'Branch', path: '/master/branch', restricted: true },
      { title: 'Location', path: '/utility/location' },
      { title: 'Manage Terms', path: '/master/manage-terms' },
      { title: 'Cloudinary Management', path: '/utility/cloudinary-manager' },
      { title: 'Downloads', path: '/utility/downloads' },
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
                        pageNames.push(`${sub.title} - ${nestedSub.title}`);
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
                sections[item.title] = pageNames;
            }
        }
    });
    
    return sections;
};

// Helper to get flatten permissions list for default state
export const getAllPermissionPages = () => {
    const sections = getMenuSections();
    return Object.values(sections).flat();
};
