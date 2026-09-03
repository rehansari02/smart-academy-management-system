import React, { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import axios from 'axios';
import StudentNavbar from './StudentNavbar';
import ScrollToTop from './ScrollToTop';
import { toast } from 'react-toastify';
import { checkIsExamRestrictedActive } from '../../utils/examTimeUtils';
import { logout } from '../../features/auth/authSlice';

const ALLOWED_EXAM_PATHS = [
    '/student/home',
    '/student/fees',
    '/student/exam',
    '/student/exam-schedule'
];

const StudentLayout = () => {
    const { user } = useSelector((state) => state.auth);
    const dispatch = useDispatch();
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        const checkProtection = async () => {
            if (!user || user.role !== 'Student') return;

            try {
                const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/student-portal/exam-conduct`, {
                    withCredentials: true
                });

                // localStorage can survive while the HTTP-only cookie belongs to
                // an older login. Never render one student's data under another
                // student's name; clear both sides and require a clean login.
                if (data.student?.userId && String(data.student.userId) !== String(user._id)) {
                    await dispatch(logout());
                    toast.error('Your previous student session was out of sync. Please login again.');
                    navigate('/student-login', { replace: true });
                    return;
                }

                const isRestricted = checkIsExamRestrictedActive(data.schedules || []);
                if (isRestricted) {
                    const currentPath = location.pathname.toLowerCase();
                    const isAllowed = ALLOWED_EXAM_PATHS.some((path) => currentPath === path || currentPath.startsWith('/student/exam/'));

                    if (!isAllowed) {
                        toast.warning('Exam mode is active! Only Home, Fees, and Exam pages are allowed until paper submission.', {
                            toastId: 'exam-mode-toast'
                        });
                        navigate('/student/exam', { replace: true });
                    }
                }
            } catch {
                // fail silently
            }
        };

        checkProtection();
    }, [location.pathname, user, navigate, dispatch]);

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 font-sans pt-20">
            <ScrollToTop />
            <StudentNavbar />
            <main className="container mx-auto px-4 pb-8">
                <Outlet />
            </main>
        </div>
    );
};

export default StudentLayout;
