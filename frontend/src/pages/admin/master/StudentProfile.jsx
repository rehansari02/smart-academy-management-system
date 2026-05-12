import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchStudentById } from '../../../features/student/studentSlice';
import { fetchBatches, fetchReferences } from '../../../features/master/masterSlice';
import { useReactToPrint } from 'react-to-print';
import { Printer, ArrowLeft, Mail, Phone, MapPin, Calendar, Book, User, CreditCard, ExternalLink } from 'lucide-react';
import moment from 'moment';

const StudentProfile = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const componentRef = useRef();
    
    const { currentStudent: student, isLoading } = useSelector((state) => state.students);
    const { batches, references } = useSelector((state) => state.master);
    
    // Local state for derived data
    const [batchTime, setBatchTime] = useState('N/A');
    const [refDetails, setRefDetails] = useState({ mobile: 'N/A', address: 'N/A' });

    useEffect(() => {
        dispatch(fetchStudentById(id));
        dispatch(fetchBatches());
        dispatch(fetchReferences());
    }, [dispatch, id]);

    // Derive Data when dependencies change
    useEffect(() => {
        if (student && batches.length > 0) {
            const batchObj = batches.find(b => b.name === student.batch);
            if (batchObj) {
                setBatchTime(`${batchObj.startTime} - ${batchObj.endTime}`);
            } else {
                setBatchTime('Batch not found');
            }
        }

        if (student && references.length > 0 && student.reference) {
             const refObj = references.find(r => r.name === student.reference);
             if (refObj) {
                 setRefDetails({ mobile: refObj.mobile, address: refObj.address || 'N/A' });
             } else {
                 // Fallback if reference matches a "Source" enum string instead of a person
                 if(['Walk-in', 'Social Media', 'Online', 'Call', 'Direct'].includes(student.reference)) {
                     setRefDetails({ mobile: '-', address: '-' });
                 } else {
                     setRefDetails({ mobile: 'Not Found', address: 'Not Found' });
                 }
             }
        }
    }, [student, batches, references]);

    const handlePrint = useReactToPrint({
        contentRef: componentRef,
        documentTitle: `Student_Profile_${student?.enrollmentNo || 'View'}`,
    });

    const getStudentPhotoUrl = (photoPath) => {
        if (!photoPath) return null;
        if (photoPath.startsWith('http')) return photoPath;
        const baseUrl = import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '');
        const cleanPath = photoPath.replace(/\\/g, '/').replace(/^\//, '');
        return `${baseUrl}/${cleanPath}`;
    };

    if (isLoading || !student) {
        return <div className="p-8 text-center text-gray-500">Loading student details...</div>;
    }

    return (
        <div className="container mx-auto p-4 md:p-8">
            {/* Header Actions */}
            <div className="flex justify-between items-center mb-6 no-print">
                <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-600 hover:text-primary transition-colors">
                    <ArrowLeft size={20} /> Back to List
                </button>
                <button onClick={handlePrint} className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded shadow hover:bg-blue-700 transition-colors">
                    <Printer size={20} /> Print Profile
                </button>
            </div>

            {/* Printable Area */}
            <div ref={componentRef} className="bg-white shadow-xl rounded-xl overflow-hidden border border-gray-200 p-8 max-w-4xl mx-auto print:shadow-none print:border-none print:w-full">
                
                {/* Header Profile Section */}
                <div className="flex flex-col md:flex-row gap-8 border-b border-gray-100 pb-8 mb-8 items-center md:items-start">
                     {/* Image */}
                     <div className="w-32 h-32 md:w-40 md:h-40 bg-white rounded-lg overflow-hidden border-4 border-white shadow flex-shrink-0">
                        {student.studentPhoto ? (
                            <img src={getStudentPhotoUrl(student.studentPhoto)} alt="Student" className="w-full h-full object-contain" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                                <User size={48} />
                            </div>
                        )}
                    </div>

                    {/* Basic Highlight */}
                    <div className="flex-1 text-center md:text-left space-y-2">
                        <h1 className="text-3xl font-bold text-gray-800">{student.firstName} {student.lastName}</h1>
                        <p className="text-lg text-primary font-medium">{student.course?.name}</p>
                        <div className="inline-block bg-blue-50 px-3 py-1 rounded border border-blue-100 mt-2">
                            <span className="text-xs text-blue-500 font-semibold uppercase tracking-wider">Enrollment No</span>
                            <span className="block text-xl font-bold text-blue-800 font-mono">{student.enrollmentNo || 'N/A'}</span>
                        </div>
                    </div>
                </div>

                {/* Main Content Sections */}
                <div className="space-y-8">
                    
                    {/* 1. Student Detail */}
                    <div>
                        <h2 className="text-lg font-bold text-gray-800 border-b pb-2 mb-4 flex items-center gap-2">
                            <User size={20} className="text-blue-600"/> Student Detail
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8 text-sm">
                             <div className="grid grid-cols-3">
                                 <span className="text-gray-500">Student Name:</span>
                                 <span className="col-span-2 font-medium text-gray-800">{student.firstName}</span>
                             </div>
                             <div className="grid grid-cols-3">
                                 <span className="text-gray-500">Father Name:</span>
                                 <span className="col-span-2 font-medium text-gray-800">{student.middleName}</span>
                             </div>
                             <div className="grid grid-cols-3">
                                 <span className="text-gray-500">Last Name:</span>
                                 <span className="col-span-2 font-medium text-gray-800">{student.lastName}</span>
                             </div>
                             <div className="grid grid-cols-3">
                                 <span className="text-gray-500">Gender:</span>
                                 <span className="col-span-2 font-medium text-gray-800">{student.gender}</span>
                             </div>
                             <div className="grid grid-cols-3">
                                 <span className="text-gray-500">Email:</span>
                                 <span className="col-span-2 font-medium text-gray-800 break-words">{student.email || '-'}</span>
                             </div>
                             <div className="grid grid-cols-3">
                                 <span className="text-gray-500">Contact(Home):</span>
                                 <span className="col-span-2 font-medium text-gray-800">{student.contactHome || '-'}</span>
                             </div>
                             <div className="grid grid-cols-3">
                                 <span className="text-gray-500">Mobile(Student):</span>
                                 <span className="col-span-2 font-medium text-gray-800">{student.mobileStudent || '-'}</span>
                             </div>
                             <div className="grid grid-cols-3">
                                 <span className="text-gray-500">Parent Mobile:</span>
                                 <span className="col-span-2 font-medium text-gray-800">{student.mobileParent}</span>
                             </div>
                             <div className="grid grid-cols-3">
                                 <span className="text-gray-500">Aadhaar No:</span>
                                 <span className="col-span-2 font-medium text-gray-800">{student.aadharCard}</span>
                             </div>
                             <div className="grid grid-cols-3">
                                 <span className="text-gray-500">DOB:</span>
                                 <span className="col-span-2 font-medium text-gray-800">
                                     {moment(student.dob).format('DD/MM/YYYY')}
                                 </span>
                             </div>
                             <div className="grid grid-cols-3">
                                 <span className="text-gray-500">Address:</span>
                                 <span className="col-span-2 font-medium text-gray-800">
                                     {student.address}, {student.city}, {student.state}
                                 </span>
                             </div>
                             <div className="grid grid-cols-3">
                                 <span className="text-gray-500">Education:</span>
                                 <span className="col-span-2 font-medium text-gray-800">{student.education || '-'}</span>
                             </div>
                        </div>
                    </div>

                    {/* 2. Student Course Detail */}
                    <div>
                        <h2 className="text-lg font-bold text-gray-800 border-b pb-2 mb-4 flex items-center gap-2">
                            <Book size={20} className="text-blue-600"/> Student Course Detail
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8 text-sm">
                             <div className="grid grid-cols-3">
                                 <span className="text-gray-500">Course Name:</span>
                                 <span className="col-span-2 font-medium text-gray-800">
                                     {student.course?.name} {student.course?.shortName ? `[${student.course.shortName}]` : ''}
                                 </span>
                             </div>
                             <div className="grid grid-cols-3">
                                 <span className="text-gray-500">Batch Name:</span>
                                 <span className="col-span-2 font-medium text-gray-800">{student.batch}</span>
                             </div>
                             <div className="grid grid-cols-3">
                                 <span className="text-gray-500">Batch Time:</span>
                                 <span className="col-span-2 font-medium text-gray-800">{batchTime}</span>
                             </div>
                        </div>
                    </div>

                    {/* 3. Reference Detail */}
                    <div>
                        <h2 className="text-lg font-bold text-gray-800 border-b pb-2 mb-4 flex items-center gap-2">
                             <ExternalLink size={20} className="text-blue-600"/> Reference Detail
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8 text-sm">
                             <div className="grid grid-cols-3">
                                 <span className="text-gray-500">Ref. Name:</span>
                                 <span className="col-span-2 font-medium text-gray-800">{student.reference || 'Direct'}</span>
                             </div>
                             <div className="grid grid-cols-3">
                                 <span className="text-gray-500">Ref. Mobile:</span>
                                 <span className="col-span-2 font-medium text-gray-800">{refDetails.mobile}</span>
                             </div>
                             <div className="grid grid-cols-3">
                                 <span className="text-gray-500">Ref. Address:</span>
                                 <span className="col-span-2 font-medium text-gray-800">{refDetails.address}</span>
                             </div>
                        </div>
                    </div>

                    {/* 4. Fees Summary */}
                    <div>
                        <h2 className="text-lg font-bold text-gray-800 border-b pb-2 mb-4 flex items-center gap-2">
                            <CreditCard size={20} className="text-blue-600"/> Fees Summary
                        </h2>
                        {(() => {
                            const courseAdmFee = student.course?.admissionFees || 0;
                            const paidAdmFee = student.admissionFeeAmount || 0;
                            const effectiveAdmFee = Math.max(courseAdmFee, paidAdmFee);
                            const calculatedTotalFees = (student.totalFees || 0) + effectiveAdmFee;
                            const pendingAdmission = Math.max(0, courseAdmFee - paidAdmFee);
                            const calculatedPendingFees = (student.pendingFees || 0) + pendingAdmission;

                            return (
                                <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                                    <div className="grid grid-cols-3 gap-6 text-center">
                                        <div>
                                            <span className="block text-gray-500 text-xs uppercase font-bold tracking-wide mb-1">Total Fees</span>
                                            <span className="font-bold text-gray-800 text-2xl">₹{calculatedTotalFees}</span>
                                        </div>
                                        <div>
                                            <span className="block text-gray-500 text-xs uppercase font-bold tracking-wide mb-1">Paid Amount</span>
                                            <span className="font-bold text-green-600 text-2xl">₹{calculatedTotalFees - calculatedPendingFees}</span>
                                        </div>
                                        <div>
                                            <span className="block text-gray-500 text-xs uppercase font-bold tracking-wide mb-1">Pending Fees</span>
                                            <span className="font-bold text-red-600 text-2xl">₹{calculatedPendingFees}</span>
                                        </div>
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-gray-200 text-center text-xs text-gray-500">
                                        Payment Plan: <span className="font-medium text-gray-700">{student.paymentPlan || 'One Time'}</span>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>

                </div>

                {/* Footer for Print */}
                <div className="hidden print:block mt-12 pt-8 border-t border-gray-300">
                    <div className="flex justify-between text-sm text-gray-600">
                        <div>
                            <p>Printed on: {moment().format('DD MMM YYYY HH:mm')}</p>
                            <p>Authorized Signature</p>
                        </div>
                        <div className="text-right">
                            <p>Smart Institute</p>
                            <p>www.smartinstitute.com</p>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default StudentProfile;
