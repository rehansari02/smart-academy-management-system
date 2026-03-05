import React from 'react';
import { Outlet } from 'react-router-dom';
import StudentNavbar from './StudentNavbar';
import ScrollToTop from './ScrollToTop';

const StudentLayout = () => {
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
