import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchStudents } from '../../../features/student/studentSlice';
import { fetchBranches, fetchBatches } from '../../../features/master/masterSlice';
import { FileText, Printer, Search } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import moment from 'moment';
import logo from '../../../assets/logo2.png';
import { toast } from 'react-toastify';

const StudentCompletionReport = () => {
    const dispatch = useDispatch();
    const { students, isLoading } = useSelector((state) => state.students);
    const { branches, batches } = useSelector((state) => state.master);
    const { user } = useSelector((state) => state.auth);

    const [selectedBatch, setSelectedBatch] = useState('');
    const [reportData, setReportData] = useState([]);
    const componentRef = useRef(null);

    useEffect(() => {
        dispatch(fetchBatches());
        if (user?.role === 'Super Admin') {
            dispatch(fetchBranches());
        }
        // Fetch all active students initially or when batch changes
        dispatch(fetchStudents({ 
            isActive: true, // Only active students usually? Or all? Usually completion report implies active students working towards it.
            batch: selectedBatch || undefined,
            pageSize: 3000 // Fetch large number for report
        }));
    }, [dispatch, selectedBatch, user]);

    useEffect(() => {
        if (students) {
            const processed = students.map((msg, index) => {
                const startDate = msg.batchStartDate ? moment(msg.batchStartDate) : null;
                let completionDate = null;
                let leftDays = null;

                if (startDate && msg.course?.duration) {
                    const duration = parseInt(msg.course.duration, 10);
                    const type = msg.course.durationType?.toLowerCase();

                    // Calculate Completion Date
                    // Logic: Start Date + Duration - 1 Day
                    let end = startDate.clone();
                    if (type?.includes('month')) {
                        end.add(duration, 'months');
                    } else if (type?.includes('year')) {
                         end.add(duration, 'years');
                    } else {
                        // Default to days if not specified or specified as days
                        end.add(duration, 'days');
                    }
                    
                    // Subtract 1 day as per requirement (01-02-2026 to 31-01-2027 is 1 year)
                    completionDate = end.subtract(1, 'days');

                    // Calculate Left Days
                    const today = moment().startOf('day');
                    // detailed difference
                    leftDays = completionDate.diff(today, 'days');
                }

                return {
                    ...msg,
                    serialNo: index + 1,
                    admissionDateDisplay: startDate ? startDate.format('DD-MM-YYYY') : '-',
                    completionDateDisplay: completionDate ? completionDate.format('DD-MM-YYYY') : '-',
                    leftDays: leftDays !== null ? leftDays : '-',
                    branchInfo: getBranchInfo(msg)
                };
            }).filter(item => item.admissionDateDisplay !== '-'); // Filter out those without start dates if necessary, or keep them. keeping for now.

            setReportData(processed);
        }
    }, [students, branches]);

    const getBranchInfo = (student) => {
        // Inherit logic from other reports
        if (!student) return {};
        
        let branchId = student.branchId;
        if (typeof branchId === 'object' && branchId !== null) {
            // Already populated
             return {
                name: branchId.name,
                address: branchId.address,
                phone: branchId.phone,
                mobile: branchId.mobile,
                email: branchId.email
            };
        }

        // Check if we have branches loaded
        if (branches && branches.length > 0) {
            const found = branches.find(b => b._id === branchId || b.name === student.branchName);
            if (found) return found;
        }

         // Fallback default
         return {
            name: "Smart Institute", 
            address: "309-A, 309-B, 3rd Floor, Sai Square Building, Bhestan Circle, Bhestan Surat Gujarat-395023",
            phone: "96017-49300", 
            mobile: "98988-30409",
            email: "smartinstitutes@gmail.com" 
        };
    };

    // Set Document Title for Ctrl+P (Browser Print)
    useEffect(() => {
        const originalTitle = document.title;
        document.title = `Student_Completion_Report_${moment().format('DD-MM-YYYY')}`;
        return () => {
            document.title = originalTitle;
        };
    }, []);

    const handlePrint = useReactToPrint({
        content: () => componentRef.current,
        documentTitle: `Student_Completion_Report_${moment().format('DD-MM-YYYY')}`,
        onAfterPrint: () => toast.success("Report Sent to Printer"),
    });

    // We take the branch info from the first student for the header, 
    // or if filtered by batch, the batch's branch.
    // Assuming mostly single branch or filtered view.
    const headerBranch = reportData.length > 0 ? reportData[0].branchInfo : getBranchInfo({});

    return (
         <div className="container mx-auto p-4 max-w-[1400px]">
            <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2 print:hidden">
                <FileText className="text-primary"/> Student Completion Report
            </h1>

            {/* Filter */}
            {/* <div className="bg-white p-4 rounded-lg shadow border border-gray-200 mb-6 print:hidden flex gap-4 items-end"> */}
                {/* <div className="w-64">
                    <label className="text-sm font-semibold text-gray-600 mb-1 block">Filter by Batch</label>
                    <select 
                        className="w-full border rounded p-2 focus:ring-2 focus:ring-primary outline-none"
                        value={selectedBatch}
                        onChange={(e) => setSelectedBatch(e.target.value)}
                    >
                        <option value="">All Batches</option>
                        {batches.map(b => (
                            <option key={b._id} value={b.name}>{b.name}</option>
                        ))}
                    </select>
                </div> */}
                {/* Print Button */}
                 {/* <button 
                    onClick={handlePrint} 
                    className="bg-green-600 text-white px-4 py-2 rounded font-bold hover:bg-green-700 transition flex items-center gap-2"
                >
                    <Printer size={18}/> Print Report
                </button> */}
            {/* </div> */}

            {/* Component to Print */}
            <div className="overflow-auto bg-gray-50 p-4 print:p-0 print:bg-white">
                <div 
                    ref={componentRef} 
                    className="bg-white shadow-lg mx-auto p-8 min-h-[297mm] print:shadow-none print:mx-0 print:p-0 print:w-full"
                >
                     {/* Header */}
                     <div className="flex justify-between items-start mb-6 border-b-2 border-primary pb-4">
                        <div className="flex items-center gap-4">
                            <img src={logo} alt="Institute Logo" className="h-20 object-contain" />
                        </div>
                        <div className="text-right text-xs space-y-1">
                            <h2 className="text-xl font-bold text-blue-600 mb-1">{headerBranch.name}</h2>
                            <div className="text-gray-600 max-w-xs ml-auto">
                                {headerBranch.address}
                            </div>
                            <p className="font-semibold text-blue-800">
                                 Ph. No. : {headerBranch.phone}, Mob. No. : {headerBranch.mobile}
                            </p>
                            <p className="text-blue-500 underline">{headerBranch.email}</p>
                        </div>
                    </div>

                    <div className="text-center mb-4">
                        <h3 className="text-lg font-bold text-black uppercase underline decoration-2 underline-offset-4">
                            Student Course Completion Report
                        </h3>
                    </div>

                    <table className="w-full border-collapse border border-gray-400 text-xs">
                        <thead>
                            <tr className="bg-blue-600 text-white print:bg-gray-200 print:text-black">
                                <th className="border border-gray-400 p-2 w-10">Sr.</th>
                                <th className="border border-gray-400 p-2 w-24">Reg. No</th>
                                <th className="border border-gray-400 p-2">Student Name</th>
                                <th className="border border-gray-400 p-2">Course Name</th>
                                <th className="border border-gray-400 p-2 w-24">Mobile No</th>
                                <th className="border border-gray-400 p-2 w-24">Adm. Date</th>
                                <th className="border border-gray-400 p-2 w-24">Comp. Date</th>
                                <th className="border border-gray-400 p-2 w-16">Left Days</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reportData.length > 0 ? (
                                reportData.map((student) => (
                                    <tr key={student._id} className="text-center hover:bg-gray-50 break-inside-avoid">
                                        <td className="border border-gray-400 p-1">{student.serialNo}</td>
                                        <td className="border border-gray-400 p-1 font-semibold">{student.regNo}</td>
                                        <td className="border border-gray-400 p-1 text-left px-2 font-bold uppercase">
                                            {student.firstName} {student.middleName} {student.lastName}
                                        </td>
                                        <td className="border border-gray-400 p-1 text-left px-2">
                                            {student.course?.shortName || student.course?.name || '-'}
                                        </td>
                                        <td className="border border-gray-400 p-1">{student.mobileStudent}</td>
                                        <td className="border border-gray-400 p-1">{student.admissionDateDisplay}</td>
                                        <td className="border border-gray-400 p-1 font-bold">{student.completionDateDisplay}</td>
                                        <td className={`border border-gray-400 p-1 font-bold ${student.leftDays < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                            {student.leftDays}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="8" className="p-4 text-center text-gray-500 border border-gray-400">
                                        {isLoading ? 'Loading data...' : 'No students found found.'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>

                     {/* Footer Info */}
                     <div className="mt-4 text-[10px] text-gray-500 flex justify-between print:mt-auto">
                        <span>Printed On: {moment().format('DD-MM-YYYY hh:mm A')}</span>
                        <span>Total Records: {reportData.length}</span>
                     </div>
                </div>
            </div>

             <style type="text/css" media="print">
                {`
                    @page { size: A4; margin: 10mm; }
                    body { -webkit-print-color-adjust: exact; }
                `}
            </style>
         </div>
    );
};

export default StudentCompletionReport;
