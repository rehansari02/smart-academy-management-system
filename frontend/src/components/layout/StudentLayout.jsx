import React, { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import axios from 'axios';
import StudentNavbar from './StudentNavbar';
import ScrollToTop from './ScrollToTop';
import { toast } from 'react-toastify';
import { checkIsExamRestrictedActive } from '../../utils/examTimeUtils';

const ALLOWED_EXAM_PATHS = [
    '/student/home',
    '/student/fees',
    '/student/exam',
    '/student/exam-schedule'
];

const StudentLayout = () => {
    const { user } = useSelector((state) => state.auth);
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        const checkProtection = async () => {
            if (!user || user.role !== 'Student') return;

            try {
                const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/student-portal/exam-conduct`, {
                    withCredentials: true
                });
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
            } catch (error) {
                // fail silently
            }
        };

        checkProtection();
    }, [location.pathname, user, navigate]);

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
