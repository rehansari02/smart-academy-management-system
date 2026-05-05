import React, { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchExamSchedules, fetchCourses, fetchBranches } from '../../../features/master/masterSlice';
import { useReactToPrint } from 'react-to-print';
import { Printer, FileText, Calendar, Loader2, ChevronDown, Filter } from 'lucide-react';
import logo from '../../../assets/logo2.png';

const TimeTableReport = () => {
    const dispatch = useDispatch();
    const componentRef = useRef();
    
    const { examSchedules, courses, branches, isLoading } = useSelector((state) => state.master);
    const { user } = useSelector((state) => state.auth);

    const [selectedCourse, setSelectedCourse] = useState('All');
    const [filteredSchedules, setFilteredSchedules] = useState([]);

    useEffect(() => {
        dispatch(fetchExamSchedules());
        dispatch(fetchCourses());
        dispatch(fetchBranches());
    }, [dispatch]);

    useEffect(() => {
        if (examSchedules) {
            if (selectedCourse === 'All') {
                setFilteredSchedules(examSchedules);
            } else {
                setFilteredSchedules(examSchedules.filter(s => s.course?._id === selectedCourse || s.course === selectedCourse));
            }
        }
    }, [examSchedules, selectedCourse]);

    const getBranchInfo = () => {
        let branchId = user?.branchId;

        if (user?.role === 'Super Admin') {
            return {
                name: "Main Branch",
                address: "Smart Institute",
                phone: "96017-49300",
                mobile: "98988-30409",
                email: "smartinstitutes@gmail.com"
            };
        }

        if (user && user.branchDetails && user.branchDetails.address) {
            return user.branchDetails;
        }

        if (branchId) {
             if (branches && branches.length > 0) {
                 const found = branches.find(b => b._id === branchId || b._id === branchId?._id);
                 if (found) return found;
             }
        }

         return {
            name: user?.branchName || "Main Branch", 
            address: "Smart Institute",
            phone: "96017-49300", 
            mobile: "98988-30409",
            email: "smartinstitutes@gmail.com" 
        };
    };

    const headerBranch = getBranchInfo();

    const handlePrint = useReactToPrint({
        content: () => componentRef.current,
        documentTitle: 'Exam_Time_Table_Report',
    });

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
                <p className="text-gray-500 font-medium">Loading Time Table Data...</p>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4 max-w-7xl">
            {/* --- Control Panel --- */}
            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 mb-8 no-print animate-fadeIn">
                <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-4">
                        <div className="bg-primary/10 p-3 rounded-lg text-primary">
                            <Calendar size={24} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-800">Examination Time Table</h1>
                            <p className="text-gray-500 text-sm">Exam Schedule Reports</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                        <div className="relative">
                            <select
                                className="appearance-none bg-gray-50 border border-gray-200 text-gray-700 py-2.5 px-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer font-medium"
                                value={selectedCourse}
                                onChange={(e) => setSelectedCourse(e.target.value)}
                            >
                                <option value="All">All Courses</option>
                                {courses?.map(c => (
                                    <option key={c._id} value={c._id}>{c.name}</option>
                                ))}
                            </select>
                            <Filter className="absolute left-3 top-3 text-gray-400" size={18} />
                            <ChevronDown className="absolute right-3 top-3 text-gray-400 pointer-events-none" size={18} />
                        </div>

                        <button
                            onClick={handlePrint}
                            className="bg-primary hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg flex items-center gap-2 font-bold shadow-lg shadow-blue-200 transition-all active:scale-95"
                        >
                            <Printer size={18} /> Print Report
                        </button>
                    </div>
                </div>
            </div>

            {/* --- Report Content --- */}
            <div ref={componentRef} className="print-container bg-white p-4 sm:p-8 rounded-lg shadow-sm border border-gray-100">
                {/* Report Header */}
                <div className="flex justify-between items-start border-b-2 border-primary pb-4 mb-8">
                    <div className="flex items-center gap-4">
                        <img src={logo} alt="Institute Logo" className="h-20 w-auto object-contain" />
                    </div>
                    <div className="text-right text-xs space-y-1">
                        <h2 className="text-xl font-bold text-blue-600 mb-1">{headerBranch.name}</h2>
                        <div className="text-gray-600 max-w-xs ml-auto font-medium">
                            {headerBranch.address}
                        </div>
                        <p className="font-bold text-blue-800">
                             Ph. No. : {headerBranch.phone}, Mob. No. : {headerBranch.mobile}
                        </p>
                        <p className="text-blue-500 underline font-medium">{headerBranch.email}</p>
                        <div className="mt-2 inline-block bg-gray-100 px-3 py-1 rounded-md border border-gray-200">
                            <span className="text-[10px] font-bold text-gray-500 uppercase block leading-tight">Report Date</span>
                            <span className="text-xs font-black text-gray-800">{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                        </div>
                    </div>
                </div>

                <div className="text-center mb-10">
                    <h3 className="text-2xl font-black text-gray-800 border-b-4 border-gray-800 inline-block px-8 pb-1 uppercase">Examination Time Table Report</h3>
                </div>

                {filteredSchedules.length === 0 ? (
                    <div className="text-center py-10 text-gray-500 font-medium">No exam schedules found.</div>
                ) : (
                    <div className="space-y-12">
                        {filteredSchedules.map((schedule, idx) => (
                            <div key={schedule._id} className="border-2 border-gray-800 rounded-sm overflow-hidden break-inside-avoid">
                                <div className="bg-gray-800 text-white px-4 py-3 flex justify-between items-center font-black">
                                    <div className="flex flex-col">
                                        <span className="text-lg uppercase">{schedule.examName}</span>
                                        <span className="text-xs font-normal italic">Course: {schedule.course?.name || 'N/A'}</span>
                                    </div>
                                    <span className="bg-white text-gray-800 px-3 py-1 rounded text-xs">REF: {schedule._id.slice(-6).toUpperCase()}</span>
                                </div>
                                
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm border-collapse">
                                        <thead>
                                            <tr className="bg-gray-100 border-b border-gray-800 text-gray-800 font-black uppercase">
                                                <th className="p-3 border-r border-gray-300 w-16 text-center">Sr</th>
                                                <th className="p-3 border-r border-gray-300 text-left">Subject</th>
                                                <th className="p-3 border-r border-gray-300 text-center w-32">Date</th>
                                                <th className="p-3 border-r border-gray-300 text-center w-48">Time</th>
                                                <th className="p-3 text-center w-24">Marks</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {schedule.timeTable?.map((item, sIdx) => (
                                                <tr key={sIdx} className="border-b border-gray-200 last:border-0 hover:bg-gray-50">
                                                    <td className="p-3 border-r border-gray-300 text-center font-bold">{sIdx + 1}</td>
                                                    <td className="p-3 border-r border-gray-300 font-bold text-gray-900 uppercase">
                                                        {item.subject?.name || 'N/A'}
                                                    </td>
                                                    <td className="p-3 border-r border-gray-300 text-center font-semibold">
                                                        {item.date ? new Date(item.date).toLocaleDateString('en-GB') : '-'}
                                                    </td>
                                                    <td className="p-3 border-r border-gray-300 text-center font-medium">
                                                        {item.startTime} - {item.endTime}
                                                    </td>
                                                    <td className="p-3 text-center">
                                                        <div className="flex flex-col text-[10px]">
                                                            <span>T: {item.theory}</span>
                                                            <span>P: {item.practical}</span>
                                                            <span className="font-bold border-t border-gray-200 mt-1">Total: {item.total}</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {schedule.remarks && (
                                    <div className="p-3 bg-gray-50 border-t border-gray-200 text-xs italic">
                                        <span className="font-bold not-italic">Remarks:</span> {schedule.remarks}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Footer Signature */}
                <div className="mt-20 flex justify-between items-end border-t border-dashed border-gray-300 pt-10 no-print-flex">
                    <div className="text-center">
                        <div className="w-48 border-b-2 border-gray-800 mb-2"></div>
                        <p className="text-xs font-black text-gray-800 uppercase tracking-widest">Controller of Exams</p>
                    </div>
                    <div className="text-center text-[10px] text-gray-400 font-medium">
                        Report generated by {user?.name} on {new Date().toLocaleString()}
                    </div>
                    <div className="text-center">
                        <div className="w-48 border-b-2 border-gray-800 mb-2"></div>
                        <p className="text-xs font-black text-gray-800 uppercase tracking-widest">Office Seal</p>
                    </div>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    .no-print { display: none !important; }
                    .print-container { 
                        box-shadow: none !important; 
                        border: none !important; 
                        padding: 0 !important;
                        margin: 0 !important;
                    }
                    body { background: white !important; }
                    @page { margin: 1cm; }
                }
                .break-inside-avoid { break-inside: avoid; }
            `}} />
        </div>
    );
};

export default TimeTableReport;
