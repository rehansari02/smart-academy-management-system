import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchStudents, resetStatus, updateStudentDocuments } from '../../../features/student/studentSlice';
import { fetchBranches, fetchCourses } from '../../../features/master/masterSlice';
import { fetchEmployees } from '../../../features/employee/employeeSlice';
import { FileText, Printer, Search, RefreshCw, Edit, X, Save, CheckCircle2, User } from 'lucide-react';
import StudentSearch from '../../../components/StudentSearch';
import { useReactToPrint } from 'react-to-print';
import moment from 'moment';
import logo from '../../../assets/logo2.png';
import { toast } from 'react-toastify';

const StudentRegistrationReport = () => {
    const dispatch = useDispatch();
    const { students, isLoading } = useSelector((state) => state.students);
    const { branches, courses } = useSelector((state) => state.master);
    const { employees } = useSelector((state) => state.employees);
    const { user } = useSelector((state) => state.auth);

    const [filters, setFilters] = React.useState({
        startDate: '',
        endDate: moment().format('YYYY-MM-DD'),
        courseFilter: '',
        branchId: user?.branchId || '',
        studentName: '',
        reference: ''
    });

    const [showReport, setShowReport] = useState(true);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [docStatus, setDocStatus] = useState({
        isPhotos: false,
        isIDProof: false,
        isMarksheetCertificate: false,
        isAddressProof: false
    });

    const componentRef = useRef(null);

    useEffect(() => {
        dispatch(fetchCourses());
        dispatch(fetchEmployees({ pageSize: 1000 }));
        if (user?.role === 'Super Admin') {
            dispatch(fetchBranches());
        }
        // Initial search
        dispatch(fetchStudents({ 
            ...filters,
            isActive: true,
            pageSize: 3000
        }));
    }, [dispatch, user]);

    const handleFilterChange = (e) => {
        setFilters({ ...filters, [e.target.name]: e.target.value });
    };

    const handleStudentSelect = (id, student) => {
        setFilters(prev => ({ ...prev, studentName: student ? `${student.firstName} ${student.lastName}` : '' }));
    };

    const handleReset = () => {
        setFilters({
            startDate: '',
            endDate: moment().format('YYYY-MM-DD'),
            courseFilter: '',
            branchId: user?.branchId || '',
            studentName: '',
            reference: ''
        });
        setShowReport(false);
    };

    const handleSearch = () => {
        dispatch(fetchStudents({ 
            ...filters,
            pageSize: 3000,
            sortBy: '-createdAt' 
        }));
        setShowReport(true);
    };

    const handleEditDocs = (student) => {
        setSelectedStudent(student);
        setDocStatus({
            isPhotos: student.isPhotos || false,
            isIDProof: student.isIDProof || false,
            isMarksheetCertificate: student.isMarksheetCertificate || false,
            isAddressProof: student.isAddressProof || false
        });
        setIsModalOpen(true);
    };

    const handleUpdateDocs = async () => {
        if (!selectedStudent) return;
        
        try {
            await dispatch(updateStudentDocuments({
                id: selectedStudent._id,
                data: docStatus
            })).unwrap();
            
            toast.success("Documents status updated successfully");
            setIsModalOpen(false);
            // Refresh the list to show updated status and verifier name
            handleSearch();
        } catch (err) {
            toast.error(err || "Failed to update documents status");
        }
    };

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
            name: "Bhestan Branch", 
            address: "309-A, 309-B, 3rd Floor, Sai Square Building, Bhestan Circle, Bhestan Surat Gujarat-395023 (INDIA)",
            phone: "96017-49300", 
            mobile: "98988-30409",
            email: "smartinstitutes@gmail.com" 
        };
    };

    const headerBranch = getBranchInfo();

    return (
         <div className="container mx-auto p-4 max-w-[1400px]">
            {/* Filter Section */}
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 mb-8 print:hidden">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <label className="text-sm font-semibold text-gray-600 mb-1 block">From Date</label>
                        <input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} className="w-full border rounded p-2 focus:ring-2 focus:ring-primary outline-none" />
                    </div>
                    <div>
                        <label className="text-sm font-semibold text-gray-600 mb-1 block">To Date</label>
                        <input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} className="w-full border rounded p-2 focus:ring-2 focus:ring-primary outline-none" />
                    </div>
                    <div>
                        <label className="text-sm font-semibold text-gray-600 mb-1 block">Course</label>
                        <select name="courseFilter" value={filters.courseFilter} onChange={handleFilterChange} className="w-full border rounded p-2 focus:ring-2 focus:ring-primary outline-none">
                            <option value="">All Courses</option>
                            {courses && courses.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                        </select>
                    </div>
                    {user?.role === 'Super Admin' && (
                        <div>
                            <label className="text-sm font-semibold text-gray-600 mb-1 block">Branch</label>
                            <select name="branchId" value={filters.branchId} onChange={handleFilterChange} className="w-full border rounded p-2 focus:ring-2 focus:ring-primary outline-none">
                                <option value="">All Branches</option>
                                {branches && branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                            </select>
                        </div>
                    )}
                    <div>
                        <StudentSearch 
                            label="Student Name"
                            placeholder="Search by name..."
                            onSelect={handleStudentSelect}
                            displayField="name"
                            additionalFilters={{ isRegistered: 'true', branchId: filters.branchId }}
                        />
                    </div>
                    <div>
                        <label className="text-sm font-semibold text-gray-600 mb-1 block">Reference By (Employee)</label>
                        <select name="reference" value={filters.reference} onChange={handleFilterChange} className="w-full border rounded p-2 focus:ring-2 focus:ring-primary outline-none">
                            <option value="">All Employees</option>
                            {employees && employees.map(emp => (
                                <option key={emp._id} value={emp.name}>{emp.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="flex gap-2 mt-4 justify-end">
                    <button onClick={handleReset} className="bg-gray-100 text-gray-600 px-4 py-2 rounded hover:bg-gray-200 border border-gray-300 font-medium transition flex items-center gap-1">
                        <RefreshCw size={16} /> Reset
                    </button>
                    <button onClick={handleSearch} className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 font-bold shadow transition flex items-center gap-2">
                        {isLoading ? 'Loading...' : <><Search size={18} /> Show Report</>}
                    </button>
                </div>
            </div>

            {/* Printable Area */}
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
                                <th rowSpan="2" className="border border-gray-400 p-1 w-20">Verified By</th>
                                <th rowSpan="2" className="border border-gray-400 p-1 w-16 print:hidden">Action</th>
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
                                            <td className="border border-gray-400 p-1 italic text-[10px] text-gray-600">
                                                {student.verifiedBy || '-'}
                                            </td>
                                            <td className="border border-gray-400 p-1 print:hidden text-center">
                                                <button 
                                                    onClick={() => handleEditDocs(student)} 
                                                    className="p-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 transition"
                                                    title="Update Documents"
                                                >
                                                    <Edit size={14} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan="13" className="p-4 text-center text-gray-500 border border-gray-400">
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

            {/* Document Verification Modal */}
            {isModalOpen && selectedStudent && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-[2rem] shadow-2xl max-w-md w-full overflow-hidden animate-fade-in-up border border-blue-100">
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-6 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="bg-white/20 p-2 rounded-xl">
                                    <FileText size={24} />
                                </div>
                                <div>
                                    <h3 className="font-black text-lg tracking-tight uppercase">Document Check</h3>
                                    <p className="text-[10px] font-bold text-blue-100 uppercase tracking-widest opacity-80">VERIFY SUBMISSION</p>
                                </div>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="hover:bg-white/20 p-2 rounded-2xl transition-all">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-8 space-y-6">
                            <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                                <div className="h-12 w-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-black text-xl">
                                    {selectedStudent.firstName?.charAt(0)}
                                </div>
                                <div>
                                    <p className="font-black text-slate-800 tracking-tight">{selectedStudent.firstName} {selectedStudent.lastName}</p>
                                    <p className="text-xs font-bold text-slate-500">Reg No: {selectedStudent.regNo}</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4">Submission Status</p>
                                
                                <DocToggle 
                                    label="Passport Size Photos" 
                                    checked={docStatus.isPhotos} 
                                    onChange={(val) => setDocStatus(prev => ({ ...prev, isPhotos: val }))} 
                                />
                                <DocToggle 
                                    label="Valid ID Proof" 
                                    checked={docStatus.isIDProof} 
                                    onChange={(val) => setDocStatus(prev => ({ ...prev, isIDProof: val }))} 
                                />
                                <DocToggle 
                                    label="Marksheet / Certificate" 
                                    checked={docStatus.isMarksheetCertificate} 
                                    onChange={(val) => setDocStatus(prev => ({ ...prev, isMarksheetCertificate: val }))} 
                                />
                                <DocToggle 
                                    label="Address Proof" 
                                    checked={docStatus.isAddressProof} 
                                    onChange={(val) => setDocStatus(prev => ({ ...prev, isAddressProof: val }))} 
                                />
                            </div>

                            <div className="pt-4 flex flex-col gap-3">
                                <button
                                    onClick={handleUpdateDocs}
                                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-100 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                                >
                                    <Save size={18} />
                                    Save Proof Status
                                </button>
                                <p className="text-[10px] text-center font-bold text-slate-400">
                                    Verification will be recorded under your name: <span className="text-blue-600">{(user.name || user.username)}</span>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

             <style type="text/css" media="print">
                {`
                    @page { size: A4; margin: 10mm; }
                    body { -webkit-print-color-adjust: exact; }
                `}
            </style>
         </div>
    );
};

const DocToggle = ({ label, checked, onChange }) => (
    <div 
        onClick={() => onChange(!checked)}
        className={`flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all ${
            checked 
            ? 'bg-emerald-50 border-emerald-500 shadow-lg shadow-emerald-50' 
            : 'bg-slate-50 border-slate-100 grayscale opacity-60'
        }`}
    >
        <div className="flex items-center gap-3">
            <div className={`p-1.5 rounded-lg ${checked ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
                <CheckCircle2 size={16} />
            </div>
            <span className={`text-sm font-black ${checked ? 'text-emerald-900' : 'text-slate-500'}`}>{label}</span>
        </div>
        <div className={`h-6 w-11 rounded-full p-1 transition-colors ${checked ? 'bg-emerald-500' : 'bg-slate-300'}`}>
            <div className={`h-4 w-4 rounded-full bg-white transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
        </div>
    </div>
);

export default StudentRegistrationReport;