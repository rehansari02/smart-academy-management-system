import React, { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchStudents } from '../../../features/student/studentSlice';
import { fetchBatches } from '../../../features/master/masterSlice';
import { useReactToPrint } from 'react-to-print';
import { Printer, FileText, Search, Loader2, ChevronDown, Filter } from 'lucide-react';
import logo from '../../../assets/logo2.png';

const BatchWiseRegister = () => {
    const dispatch = useDispatch();
    const componentRef = useRef();
    
    const { students, isLoading: studentsLoading } = useSelector((state) => state.students);
    const { batches, isLoading: batchesLoading } = useSelector((state) => state.master);
    const { user } = useSelector((state) => state.auth);

    const [selectedBatch, setSelectedBatch] = useState('All');
    const [groupedData, setGroupedData] = useState({});
    const [summaryData, setSummaryData] = useState([]);

    useEffect(() => {
        dispatch(fetchStudents({ pageSize: 1000 })); // Fetch many students for report
        dispatch(fetchBatches());
    }, [dispatch]);

    useEffect(() => {
        if (students && students.length > 0) {
            // Filter students by selected batch if not 'All'
            const filteredStudents = selectedBatch === 'All' 
                ? students 
                : students.filter(s => s.batch === selectedBatch);

            // Group by batch
            const groups = {};
            filteredStudents.forEach(student => {
                const bName = student.batch || 'Unassigned';
                if (!groups[bName]) groups[bName] = [];
                groups[bName].push(student);
            });

            // Sort groups (General Batch at end if possible)
            const sortedGroups = {};
            Object.keys(groups).sort((a, b) => {
                if (a.toLowerCase().includes('general')) return 1;
                if (b.toLowerCase().includes('general')) return -1;
                return a.localeCompare(b);
            }).forEach(key => {
                sortedGroups[key] = groups[key];
            });

            setGroupedData(sortedGroups);

            // Calculate summary
            const summary = Object.keys(groups).map(batchName => ({
                name: batchName,
                count: groups[batchName].length
            })).sort((a, b) => a.name.localeCompare(b.name));
            setSummaryData(summary);
        }
    }, [students, selectedBatch]);

    const handlePrint = useReactToPrint({
        content: () => componentRef.current,
        documentTitle: 'Batch_Wise_Register_Report',
    });

    const getBatchTime = (batchName) => {
        const batchObj = batches?.find(b => b.name === batchName);
        if (batchObj) {
            return `${batchObj.startTime} to ${batchObj.endTime}`;
        }
        return batchName;
    };

    if (studentsLoading || batchesLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
                <p className="text-gray-500 font-medium">Generating Report Data...</p>
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
                            <FileText size={24} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-800">Batch-Wise Register</h1>
                            <p className="text-gray-500 text-sm">General Student Reports</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                        <div className="relative">
                            <select
                                className="appearance-none bg-gray-50 border border-gray-200 text-gray-700 py-2.5 px-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer font-medium"
                                value={selectedBatch}
                                onChange={(e) => setSelectedBatch(e.target.value)}
                            >
                                <option value="All">All Batches</option>
                                {[...new Set(students?.map(s => s.batch).filter(Boolean))].sort().map(b => (
                                    <option key={b} value={b}>{b}</option>
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
                <div className="flex justify-between items-start border-b-2 border-primary pb-6 mb-8">
                    <div className="flex items-center gap-4">
                        <img src={logo} alt="Institute Logo" className="h-20 w-auto object-contain" />
                        <div>
                            <h2 className="text-3xl font-black text-primary tracking-tight">SMART INSTITUTE</h2>
                            <p className="text-gray-600 font-bold uppercase tracking-widest text-sm">{user?.branchName || 'Main Branch'}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="bg-gray-100 px-4 py-2 rounded-lg inline-block">
                            <p className="text-xs font-bold text-gray-500 uppercase">Report Date</p>
                            <p className="text-sm font-black text-gray-800">{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                        </div>
                    </div>
                </div>

                <div className="text-center mb-10">
                    <h3 className="text-2xl font-black text-gray-800 border-b-4 border-gray-800 inline-block px-8 pb-1">BATCH WISE REGISTER</h3>
                </div>

                {/* Data Grid */}
                <div className="grid grid-cols-1 gap-10">
                    {Object.keys(groupedData).map((batchName, bIdx) => (
                        <div key={batchName} className="border-2 border-gray-800 rounded-sm overflow-hidden break-inside-avoid mb-6">
                            <div className="bg-gray-800 text-white px-4 py-2 flex justify-between items-center font-black italic">
                                <span>{bIdx + 1}st: {getBatchTime(batchName)}</span>
                                <span className="bg-white text-gray-800 px-3 py-0.5 rounded text-xs">TOTAL: {groupedData[batchName].length}</span>
                            </div>
                            
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs border-collapse">
                                    <thead>
                                        <tr className="bg-gray-100 border-b border-gray-800 text-gray-800 font-black uppercase">
                                            <th className="p-2 border-r border-gray-300 w-10">Sr</th>
                                            <th className="p-2 border-r border-gray-300 w-24">Reg</th>
                                            <th className="p-2 border-r border-gray-300 text-left">Student Name</th>
                                            <th className="p-2 border-r border-gray-300 w-32">Mobile Numbers</th>
                                            <th className="p-2 text-left">Courses</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {groupedData[batchName].map((student, sIdx) => (
                                            <tr key={student._id} className="border-b border-gray-200 last:border-0 hover:bg-gray-50">
                                                <td className="p-2 border-r border-gray-300 text-center font-bold">{sIdx + 1}</td>
                                                <td className="p-2 border-r border-gray-300 text-center font-mono font-bold text-blue-800">{student.regNo || '-'}</td>
                                                <td className="p-2 border-r border-gray-300 font-bold text-gray-900 uppercase">
                                                    {student.firstName} {student.middleName} {student.lastName}
                                                </td>
                                                <td className="p-2 border-r border-gray-300 whitespace-nowrap">
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-1.5"><span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-black text-[10px]">G</span> <span className="font-semibold">{student.mobileParent || '-'}</span></div>
                                                        <div className="flex items-center gap-1.5"><span className="w-4 h-4 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-black text-[10px]">H</span> <span className="font-semibold">{student.contactHome || '-'}</span></div>
                                                        <div className="flex items-center gap-1.5"><span className="w-4 h-4 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-black text-[10px]">S</span> <span className="font-semibold">{student.mobileStudent || '-'}</span></div>
                                                    </div>
                                                </td>
                                                <td className="p-2">
                                                    <div className="flex flex-wrap gap-1">
                                                        {student.course?.name && (
                                                            <span className="bg-gray-100 px-2 py-0.5 rounded text-[10px] font-black border border-gray-300">
                                                                {student.course.name}
                                                            </span>
                                                        )}
                                                        {student.batchStartDate && (
                                                            <div className="text-[10px] text-gray-500 font-bold mt-1 w-full">
                                                                D.O.J: {new Date(student.batchStartDate).toLocaleDateString('en-GB')}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Summary Table */}
                <div className="mt-12 break-inside-avoid">
                    <h4 className="text-xl font-black text-gray-800 mb-4 border-l-4 border-primary pl-3">BATCH SUMMARY</h4>
                    <div className="max-w-md">
                        <table className="w-full border-2 border-gray-800 text-sm">
                            <thead className="bg-gray-800 text-white">
                                <tr>
                                    <th className="p-3 text-left font-black uppercase">Batch Name</th>
                                    <th className="p-3 text-center font-black uppercase w-32">Students</th>
                                </tr>
                            </thead>
                            <tbody className="font-bold">
                                {summaryData.map((sum, idx) => (
                                    <tr key={idx} className="border-b border-gray-800 last:border-0 even:bg-gray-50">
                                        <td className="p-3 text-gray-800">{sum.name}</td>
                                        <td className="p-3 text-center text-primary text-lg">{sum.count}</td>
                                    </tr>
                                ))}
                                <tr className="bg-gray-800 text-white font-black">
                                    <td className="p-3 text-right uppercase tracking-wider">Grand Total</td>
                                    <td className="p-3 text-center text-xl underline decoration-double decoration-primary underline-offset-4">
                                        {summaryData.reduce((acc, curr) => acc + curr.count, 0)}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Footer Signature */}
                <div className="mt-20 flex justify-between items-end border-t border-dashed border-gray-300 pt-10 no-print-flex">
                    <div className="text-center">
                        <div className="w-48 border-b-2 border-gray-800 mb-2"></div>
                        <p className="text-xs font-black text-gray-800 uppercase tracking-widest">Authorized Signatory</p>
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

export default BatchWiseRegister;
