import React, { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchExamResults, fetchCourses, fetchBranches } from '../../../features/master/masterSlice';
import { useReactToPrint } from 'react-to-print';
import { Printer, Award, Search, Loader2, ChevronDown, Filter } from 'lucide-react';
import logo from '../../../assets/logo2.png';

const CertificateIssueRegister = () => {
    const dispatch = useDispatch();
    const componentRef = useRef();
    
    const { examResults, courses, branches, isLoading } = useSelector((state) => state.master);
    const { user } = useSelector((state) => state.auth);

    const [selectedCourse, setSelectedCourse] = useState('All');
    const [filteredResults, setFilteredResults] = useState([]);

    useEffect(() => {
        dispatch(fetchExamResults());
        dispatch(fetchCourses());
        dispatch(fetchBranches());
    }, [dispatch]);

    useEffect(() => {
        if (examResults) {
            // Filter results that have a CSR Number (Certificate Serial Register)
            const certResults = examResults.filter(r => r.csrNumber);
            
            if (selectedCourse === 'All') {
                setFilteredResults(certResults);
            } else {
                setFilteredResults(certResults.filter(r => r.course?._id === selectedCourse || r.course === selectedCourse));
            }
        }
    }, [examResults, selectedCourse]);

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
        documentTitle: 'Certificate_Issue_Register_Report',
    });

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
                <p className="text-gray-500 font-medium">Loading Register Data...</p>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4 max-w-7xl">
            {/* --- Control Panel --- */}
            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 mb-8 no-print animate-fadeIn">
                <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-4">
                        <div className="bg-amber-100 p-3 rounded-lg text-amber-600">
                            <Award size={24} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-800">Certificate Issue Register</h1>
                            <p className="text-gray-500 text-sm">Certificate Tracking Reports</p>
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
                            <Printer size={18} /> Print Register
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
                            <span className="text-[10px] font-bold text-gray-500 uppercase block leading-tight">Register Date</span>
                            <span className="text-xs font-black text-gray-800">{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                        </div>
                    </div>
                </div>

                <div className="text-center mb-10">
                    <h3 className="text-2xl font-black text-gray-800 border-b-4 border-gray-800 inline-block px-8 pb-1 uppercase">Certificate Issue Register</h3>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse border-2 border-gray-800">
                        <thead>
                            <tr className="bg-gray-800 text-white font-black uppercase">
                                <th className="p-3 border border-gray-600 w-12">Sr</th>
                                <th className="p-3 border border-gray-600 w-32">CSR No.</th>
                                <th className="p-3 border border-gray-600 w-32">Reg No.</th>
                                <th className="p-3 border border-gray-600 text-left">Student Name</th>
                                <th className="p-3 border border-gray-600 text-left">Course</th>
                                <th className="p-3 border border-gray-600 w-24">Grade</th>
                                <th className="p-3 border border-gray-600 w-32">Issue Date</th>
                                <th className="p-3 border border-gray-600 w-32 text-center">Signature</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredResults.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="p-10 text-center text-gray-500 font-bold text-sm italic bg-gray-50">
                                        No certificates recorded in the register yet.
                                    </td>
                                </tr>
                            ) : (
                                filteredResults.map((result, idx) => (
                                    <tr key={result._id} className="border-b border-gray-800 hover:bg-gray-50 transition-colors">
                                        <td className="p-3 border-r border-gray-300 text-center font-bold">{idx + 1}</td>
                                        <td className="p-3 border-r border-gray-300 text-center font-black text-amber-700">{result.csrNumber}</td>
                                        <td className="p-3 border-r border-gray-300 text-center font-mono font-bold">{result.student?.regNo || '-'}</td>
                                        <td className="p-3 border-r border-gray-300 font-black text-gray-900 uppercase">
                                            {result.student?.firstName} {result.student?.lastName}
                                        </td>
                                        <td className="p-3 border-r border-gray-300 font-bold text-gray-600">
                                            {result.course?.name || 'N/A'}
                                        </td>
                                        <td className="p-3 border-r border-gray-300 text-center font-black">
                                            <span className={`px-2 py-1 rounded ${
                                                result.grade === 'A+' ? 'bg-green-100 text-green-800' :
                                                result.grade === 'A' ? 'bg-blue-100 text-blue-800' :
                                                'bg-gray-100 text-gray-800'
                                            }`}>
                                                {result.grade}
                                            </span>
                                        </td>
                                        <td className="p-3 border-r border-gray-300 text-center font-medium">
                                            {new Date(result.createdAt).toLocaleDateString('en-GB')}
                                        </td>
                                        <td className="p-3 border-gray-300">
                                            <div className="h-8 border-b border-gray-200"></div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer Signature */}
                <div className="mt-20 flex justify-between items-end border-t border-dashed border-gray-300 pt-10 no-print-flex">
                    <div className="text-center">
                        <div className="w-48 border-b-2 border-gray-800 mb-2"></div>
                        <p className="text-xs font-black text-gray-800 uppercase tracking-widest">In-Charge Register</p>
                    </div>
                    <div className="text-center text-[10px] text-gray-400 font-medium">
                        Register generated by {user?.name} on {new Date().toLocaleString()}
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
                    @page { margin: 1cm; orientation: landscape; }
                }
            `}} />
        </div>
    );
};

export default CertificateIssueRegister;
