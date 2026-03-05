import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchStudents } from '../../../features/student/studentSlice';
import { fetchBranches, fetchBatches } from '../../../features/master/masterSlice';
import { FileText, Printer, Search } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import moment from 'moment';
import logo from '../../../assets/logo2.png';
import { toast } from 'react-toastify';

const StudentContactReport = () => {
    const dispatch = useDispatch();
    const { students, isLoading } = useSelector((state) => state.students);
    const { branches, batches } = useSelector((state) => state.master);
    const { user } = useSelector((state) => state.auth);

    const [selectedBatch, setSelectedBatch] = useState('');
    const [reportData, setReportData] = useState([]);
    const componentRef = useRef(null);

    // Initial Fetch
    useEffect(() => {
        dispatch(fetchBatches());
        if (user?.role === 'Super Admin') {
            dispatch(fetchBranches());
        }
        dispatch(fetchStudents({ 
            isActive: true, 
            batch: selectedBatch || undefined,
            pageSize: 3000 
        }));
    }, [dispatch, selectedBatch, user]);

    // Process Data
    useEffect(() => {
        if (students) {
            const processed = students.map((msg, index) => {
                // Construct Full Address
                const fullAddress = msg.address;

                return {
                    ...msg,
                    serialNo: index + 1,
                    fullName: `${msg.firstName || ''} ${msg.lastName || ''}`.toUpperCase(),
                    parentName: `${msg.middleName || ''}`.toUpperCase(),
                    fullAddress: fullAddress || '-',
                    studentMobile: msg.mobileStudent || '-',
                    parentMobile: msg.mobileParent || '-',
                    branchInfo: getBranchInfo(msg),
                    regNo: msg.regNo || '-'
                };
            });
            setReportData(processed);
        }
    }, [students, branches]);

    // Helper for Branch Info (Header)
    const getBranchInfo = (student) => {
        if (!student) return {};
        
        let branchId = student.branchId;
        if (typeof branchId === 'object' && branchId !== null) {
             return {
                name: branchId.name,
                address: branchId.address,
                phone: branchId.phone,
                mobile: branchId.mobile,
                email: branchId.email
            };
        }

        if (branches && branches.length > 0) {
            const found = branches.find(b => b._id === branchId || b.name === student.branchName);
            if (found) return found;
        }

         return {
            name: "Smart Institute", 
            address: "309-A, 309-B, 3rd Floor, Sai Square Building, Bhestan Circle, Bhestan Surat Gujarat-395023",
            phone: "96017-49300", 
            mobile: "98988-30409",
            email: "smartinstitutes@gmail.com" 
        };
    };

    // Print Title Logic
    useEffect(() => {
        const originalTitle = document.title;
        document.title = `Student_Contact_Report_${moment().format('DD-MM-YYYY')}`;
        return () => {
            document.title = originalTitle;
        };
    }, []);

    const handlePrint = useReactToPrint({
        content: () => componentRef.current,
        documentTitle: `Student_Contact_Report_${moment().format('DD-MM-YYYY')}`,
        onAfterPrint: () => toast.success("Report Sent to Printer"),
    });

    const headerBranch = reportData.length > 0 ? reportData[0].branchInfo : getBranchInfo({});

    return (
         <div className="container mx-auto p-4 max-w-[1400px]">
            <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2 print:hidden">
                <FileText className="text-primary"/> Student Contact Report
            </h1>

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
                            <h2 className="text-xl font-bold text-blue-600 mb-1">{headerBranch.name || 'Bhestan Branch'}</h2>
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
                            Student Contact Details Report
                        </h3>
                    </div>

                    <table className="w-full border-collapse border border-gray-400 text-xs text-left">
                        <thead>
                            <tr className="bg-blue-600 text-white print:bg-gray-200 print:text-black">
                                <th className="border border-gray-400 p-2 w-10 text-center">Sr.</th>
                                {/* <th className="border border-gray-400 p-2 w-24 text-center">Reg. No</th> */}
                                <th className="border border-gray-400 p-2 w-48">Student Name</th>
                                <th className="border border-gray-400 p-2 w-32">Guardian Name</th>
                                <th className="border border-gray-400 p-2">Address</th>
                                <th className="border border-gray-400 p-2 w-28 text-center">Contact No</th>
                                <th className="border border-gray-400 p-2 w-28 text-center">Parent Mobiles</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reportData.length > 0 ? (
                                reportData.map((student) => (
                                    <tr key={student._id} className="hover:bg-gray-50 break-inside-avoid">
                                        <td className="border border-gray-400 p-1 text-center">{student.serialNo}</td>
                                        {/* <td className="border border-gray-400 p-1 text-center font-semibold">{student.regNo}</td> */}
                                        <td className="border border-gray-400 p-1 font-bold uppercase">
                                            {student.fullName}
                                        </td>
                                        <td className="border border-gray-400 p-1 uppercase">
                                            {student.parentName}
                                        </td>
                                        <td className="border border-gray-400 p-1 uppercase leading-tight">
                                            {student.fullAddress}
                                        </td>
                                        <td className="border border-gray-400 p-1 text-center font-medium">{student.studentMobile}</td>
                                        <td className="border border-gray-400 p-1 text-center font-medium">{student.parentMobile}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" className="p-4 text-center text-gray-500 border border-gray-400">
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
                    @page { size: A4 ; margin: 10mm; }
                    body { -webkit-print-color-adjust: exact; }
                `}
            </style>
         </div>
    );
};

export default StudentContactReport;
