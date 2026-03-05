import React, { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchStudents } from '../../../features/student/studentSlice';
import { fetchBranches } from '../../../features/master/masterSlice';
import { FileText, Printer } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import moment from 'moment';
import logo from '../../../assets/logo2.png';
import { toast } from 'react-toastify';

const StudentRegistrationReport = () => {
    const dispatch = useDispatch();
    const { students, isLoading } = useSelector((state) => state.students);
    const { branches } = useSelector((state) => state.master);
    const { user } = useSelector((state) => state.auth);

    const componentRef = useRef(null);

    useEffect(() => {
        if (user?.role === 'Super Admin') {
            dispatch(fetchBranches());
        }
        // Fetch students with large pageSize for report
        dispatch(fetchStudents({ 
            pageSize: 3000,
            sortBy: '-createdAt' 
        }));
    }, [dispatch, user]);

    useEffect(() => {
        const originalTitle = document.title;
        document.title = `Student_Registration_Report_${moment().format('DD-MM-YYYY')}`;
        return () => {
            document.title = originalTitle;
        };
    }, []);
        
    const handlePrint = useReactToPrint({
        content: () => componentRef.current,
        documentTitle: `Student_Registration_Report_${moment().format('DD-MM-YYYY')}`,
        onAfterPrint: () => toast.success("Report Sent to Printer"),
    });

    // Helper to get branch details for the header
    const getBranchInfo = () => {
        const firstStudent = students && students.length > 0 ? students[0] : null;
        let branchId = firstStudent?.branchId || user?.branchId;

        if (branchId) {
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
                 const found = branches.find(b => b._id === branchId);
                 if (found) return found;
             }
        }

         return {
            name: "Smart Institute", 
            address: "309-A, 309-B, 3rd Floor, Sai Square Building, Bhestan Circle, Bhestan Surat Gujarat-395023",
            phone: "96017-49300", 
            mobile: "98988-30409",
            email: "smartinstitutes@gmail.com" 
        };
    };

    const headerBranch = getBranchInfo();

    return (
         <div className="container mx-auto p-4 max-w-[1400px]">
            <div className="flex justify-between items-center mb-6 print:hidden">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <FileText className="text-primary"/> Student Registration Report
                </h1>
                {/* <button 
                    onClick={handlePrint} 
                    className="bg-green-600 text-white px-4 py-2 rounded font-bold hover:bg-green-700 transition flex items-center gap-2"
                >
                    <Printer size={18}/> Print Report
                </button> */}
            </div>

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
                            Student Application Form Received & Registration Report
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">
                            Date: {moment().format('DD-MM-YYYY')}
                        </p>
                    </div>

                    <table className="w-full border-collapse border border-gray-400 text-[10px]">
                        <thead>
                            <tr className="bg-blue-600 text-white print:bg-gray-200 print:text-black">
                                <th rowSpan="2" className="border border-gray-400 p-1 w-8">Sr.</th>
                                <th rowSpan="2" className="border border-gray-400 p-1 w-24">App. Date</th>
                                <th rowSpan="2" className="border border-gray-400 p-1 w-20">Reg. No</th>
                                <th rowSpan="2" className="border border-gray-400 p-1 w-48">Student Full Name</th>
                                <th rowSpan="2" className="border border-gray-400 p-1 w-12">Status</th>
                                <th colSpan="4" className="border border-gray-400 p-1">Document Details</th>
                                <th colSpan="2" className="border border-gray-400 p-1">Registration Status</th>
                            </tr>
                            <tr className="bg-blue-500 text-white print:bg-gray-100 print:text-black">
                                <th className="border border-gray-400 p-1 w-10">Photo</th>
                                <th className="border border-gray-400 p-1 w-10">ID</th>
                                <th className="border border-gray-400 p-1 w-12">Mark</th>
                                <th className="border border-gray-400 p-1 w-10">Addr</th>
                                <th className="border border-gray-400 p-1 w-16">Admission Fees</th>
                                <th className="border border-gray-400 p-1 w-16">Regestration Fees</th>
                            </tr>
                        </thead>
                        <tbody>
                            {!isLoading && students && students.length > 0 ? (
                                students.map((student, index) => {
                                    // Logic for Admission Fees
                                    const admissionAmount = student.admissionFeeAmount || 0;
                                    const isAdmissionPaid = student.isAdmissionFeesPaid || admissionAmount > 0;

                                    // Logic for Registration Fees
                                    // Use EMI Details first, fallback to Course Master, fallback to 0
                                    const registrationAmount = student.emiDetails?.registrationFees 
                                        || student.course?.registrationFees 
                                        || 0;
                                    const isRegistrationPaid = student.isRegistered;

                                    return (
                                        <tr key={student._id} className="text-center hover:bg-gray-50 break-inside-avoid">
                                            <td className="border border-gray-400 p-1">{index + 1}</td>
                                            <td className="border border-gray-400 p-1">
                                                {student.admissionDate ? moment(student.admissionDate).format('DD-MM-YYYY') : '-'}
                                            </td>
                                            <td className="border border-gray-400 p-1 font-semibold">
                                                {student.regNo || '-'}
                                            </td>
                                            <td className="border border-gray-400 p-1 text-left px-2 uppercase font-medium">
                                                {student.firstName} {student.middleName} {student.lastName}
                                            </td>
                                            <td className={`border border-gray-400 p-1 font-bold ${student.isActive ? 'text-green-600' : 'text-red-600'}`}>
                                                {student.isActive ? 'Active' : 'Inactive'}
                                            </td>
                                            
                                            {/* Document Details */}
                                            <td className="border border-gray-400 p-1">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                                                    student.isPhotos ? 'bg-green-100 text-green-800 border-green-200' : 'bg-red-100 text-red-800 border-red-200'}`}>{student.isPhotos ? 'Yes' : 'No'}</span>
                                            </td>
                                            <td className="border border-gray-400 p-1">
                                                 <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                                                    student.isIDProof ? 'bg-green-100 text-green-800 border-green-200' : 'bg-red-100 text-red-800 border-red-200'}`}>{student.isIDProof ? 'Yes' : 'No'}</span>
                                            </td>
                                            <td className="border border-gray-400 p-1">
                                                 <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                                                    student.isMarksheetCertificate ? 'bg-green-100 text-green-800 border-green-200' : 'bg-red-100 text-red-800 border-red-200'}`}>{student.isMarksheetCertificate ? 'Yes' : 'No'}</span>
                                            </td>
                                            <td className="border border-gray-400 p-1">
                                                 <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                                                    student.isAddressProof ? 'bg-green-100 text-green-800 border-green-200' : 'bg-red-100 text-red-800 border-red-200'}`}>{student.isAddressProof ? 'Yes' : 'No'}</span>
                                            </td>

                                            {/* Registration Status - Admission Fees */}
                                            <td className={`border border-gray-400 p-1 font-bold`}>
                                                {admissionAmount}
                                            </td>

                                            {/* Registration Status - Registration Fees */}
                                            <td className={`border border-gray-400 p-1 font-bold`}>
                                                {isRegistrationPaid ? registrationAmount : 0}
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan="11" className="p-4 text-center text-gray-500 border border-gray-400">
                                        {isLoading ? 'Loading...' : 'No records found.'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>

                     {/* Footer Info */}
                     <div className="mt-4 text-[10px] text-gray-500 flex justify-between print:mt-auto">
                        <span>Printed On: {moment().format('DD-MM-YYYY hh:mm A')}</span>
                        <span>Total Records: {students?.length || 0}</span>
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

export default StudentRegistrationReport;