import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Calendar, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import moment from 'moment';
import { fetchDashboardStats } from '../../features/student/studentPortalSlice';
import Loading from '../../components/Loading';

const StudentHome = () => {
    const { user } = useSelector((state) => state.auth);
    const { stats, isLoading } = useSelector((state) => state.studentPortal);
    const dispatch = useDispatch();

    useEffect(() => {
        dispatch(fetchDashboardStats());
    }, [dispatch]);

    if (isLoading || !stats) {
        return <Loading />;
    }

    const { 
        totalCourseDays, 
        daysSinceJoining, 
        presentDays, 
        currentMonthPresent, 
        currentMonthTotal, 
        studentName 
    } = stats;

    const calculatePercentage = (present, total) => {
        if (!total || total === 0) return 0;
        return Math.round((present / total) * 100);
    };

    return (
        <div className="space-y-6">
             <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h1 className="text-2xl font-bold text-gray-800">Welcome back, {studentName || user?.name}!</h1>
                <p className="text-gray-500 mt-1">Here is your attendance overview.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Overall Attendance */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 bg-blue-50 rounded-bl-3xl">
                        <Calendar className="text-primary w-8 h-8" />
                    </div>
                    <h2 className="text-lg font-bold text-gray-700 mb-4">Overall Attendance</h2>
                    <div className="flex items-end gap-2">
                        <span className="text-4xl font-black text-gray-900">{presentDays}</span>
                        {/* User requested "total days of learning like if 12 moths than 365" - using daysSinceJoining effectively shows days passed? 
                            Or should it be Total Course Days? "365". 
                            Usually "Attendance" is "Present / Working Days". 
                            But user asked: "present days / total days of learning like if 12 months than 365".
                            This implies they want to see progress against total course duration? Or total days passed?
                            "Total Days of Learning" usually implies days elapsed since start.
                            Let's show Days Since Joining as the denominator for "Attendance so far", 
                            or Total Course Days if they want to see "progress in course".
                            Given "Attendance", it makes most sense to be Present / Days Elapsed. 
                            However, user mentioned "if 12 months then 365", suggesting the COURSE DURATION. 
                            Let's display both cleanly.
                        */}
                        <span className="text-gray-500 font-medium mb-1">/ {daysSinceJoining} Days Passed</span>
                    </div>
                    <div className="mt-4 w-full bg-gray-100 rounded-full h-2">
                        <div 
                            className="bg-primary h-2 rounded-full transition-all duration-1000" 
                            style={{ width: `${calculatePercentage(presentDays, daysSinceJoining)}%` }}
                        ></div>
                    </div>
                    <div className="flex justify-between mt-2">
                         <p className="text-sm text-gray-500 font-medium">
                            {calculatePercentage(presentDays, daysSinceJoining)}% Attendance
                        </p>
                        <p className="text-xs text-gray-400">
                            Total Course Duration: {totalCourseDays} Days
                        </p>
                    </div>
                   
                </div>

                {/* Current Month Attendance */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 bg-green-50 rounded-bl-3xl">
                        <Clock className="text-green-600 w-8 h-8" />
                    </div>
                    <h2 className="text-lg font-bold text-gray-700 mb-4">Current Month ({moment().format('MMMM')})</h2>
                     <div className="flex items-end gap-2">
                        <span className="text-4xl font-black text-gray-900">{currentMonthPresent}</span>
                        <span className="text-gray-500 font-medium mb-1">/ {currentMonthTotal} Working Days</span>
                    </div>
                    <div className="mt-4 w-full bg-gray-100 rounded-full h-2">
                        <div 
                            className="bg-green-500 h-2 rounded-full transition-all duration-1000" 
                            style={{ width: `${calculatePercentage(currentMonthPresent, currentMonthTotal)}%` }}
                        ></div>
                    </div>
                     <p className="mt-2 text-sm text-gray-500 font-medium">
                        {calculatePercentage(currentMonthPresent, currentMonthTotal)}% Present this month
                    </p>
                </div>
            </div>

            {/* Additional info */}
            <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-start gap-3">
                <AlertCircle className="text-blue-600 w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                   <h3 className="font-bold text-blue-800 text-sm">Attendance Notice</h3>
                   <p className="text-sm text-blue-700 mt-1">Please ensure you mark your attendance daily. If you find any discrepancy, please contact the admin office immediately.</p>
                </div>
            </div>
        </div>
    );
};

export default StudentHome;
