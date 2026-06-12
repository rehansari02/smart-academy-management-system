import React, { useRef } from 'react';
import { X, Printer } from 'lucide-react';
import { formatDate } from '../../utils/dateUtils';

const InquiryViewModal = ({ inquiry, onClose }) => {
    const printRef = useRef();

    const handlePrint = () => {
        const printContent = printRef.current.innerHTML;
        const originalContents = document.body.innerHTML;

        document.body.innerHTML = printContent;
        window.print();
        document.body.innerHTML = originalContents;
        window.location.reload(); // Reload to restore event listeners destroyed by innerHTML replacement
    };

    if (!inquiry) return null;

    // Build a helper history if followUpHistory is missing or empty but followUpDate is set
    const historyList = inquiry.followUpHistory && inquiry.followUpHistory.length > 0 
        ? inquiry.followUpHistory 
        : (inquiry.followUpDate ? [{
            date: inquiry.followUpDate,
            remarks: inquiry.followUpDetails || 'Initial follow-up',
            status: inquiry.status || 'Open',
            followUpBy: inquiry.followUpBy,
            createdAt: inquiry.createdAt || inquiry.inquiryDate || new Date()
          }] : []);

    const followUpCount = inquiry.followUpCount ?? historyList.filter((item) => item.activityType === 'followup').length;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4 backdrop-blur-sm print:hidden">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl overflow-hidden animate-fadeIn flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="bg-blue-600 text-white p-4 flex justify-between items-center print:hidden">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        Inquiry Details
                    </h2>
                    <div className="flex gap-2">
                        {/* <button onClick={handlePrint} className="bg-white text-blue-600 px-3 py-1 rounded text-sm font-bold flex items-center gap-1 hover:bg-blue-50 transition">
                            <Printer size={16}/> Print
                        </button> */}
                        <button onClick={onClose} className="text-white hover:text-red-200 transition"><X size={24} /></button>
                    </div>
                </div>

                {/* Printable Content */}
                <div className="p-8 overflow-y-auto print:p-0 print:overflow-visible">

                    {/* Print Header (Only visible when printing or in this view) */}
                    <div className="mb-6 border-b pb-4">
                        <h1 className="text-2xl font-bold text-gray-800 text-center uppercase tracking-wide">Inquiry Information</h1>
                        <p className="text-center text-gray-500 text-sm mt-1">Generated on {new Date().toLocaleDateString()}</p>
                    </div>

                    <div className="space-y-6 text-sm">

                        {/* Student Detail Section */}
                        <div>
                            <div className="bg-gray-50 p-2 font-bold text-blue-800 uppercase text-xs tracking-wider border-l-4 border-blue-500 mb-4">
                                Student Detail
                            </div>
                            <div className="flex flex-col md:flex-row gap-6">
                                {/* Photo */}
                                <div className="flex-shrink-0">
                                    {inquiry.studentPhoto ? (
                                        <div className="text-center">
                                            <img
                                                src={inquiry.studentPhoto.startsWith('http') ? inquiry.studentPhoto : `${import.meta.env.VITE_API_URL}/${inquiry.studentPhoto}`}
                                                onError={(e) => { e.target.onerror = null; e.target.src = "https://via.placeholder.com/150?text=No+Image"; }}
                                                alt="Student"
                                                className="w-32 h-32 rounded-lg object-cover border-2 border-gray-300 shadow-md"
                                            />
                                        </div>
                                    ) : (
                                        <div className="w-32 h-32 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50">
                                            <span className="text-gray-400 text-sm">No Image</span>
                                        </div>
                                    )}
                                </div>

                                {/* Fields Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 flex-grow">
                                    {/* Row 1 */}
                                    <div>
                                        <span className="block text-gray-500 text-xs uppercase font-semibold">Student Name</span>
                                        <span className="font-medium text-gray-900">{inquiry.firstName} {inquiry.lastName}</span>
                                    </div>
                                    <div>
                                        <span className="block text-gray-500 text-xs uppercase font-semibold">Email</span>
                                        <span className="font-medium text-gray-900">{inquiry.email || '-'}</span>
                                    </div>

                                    {/* Row 2 */}
                                    <div>
                                        <span className="block text-gray-500 text-xs uppercase font-semibold">Father Name</span>
                                        <span className="font-medium text-gray-900">{inquiry.middleName || '-'}</span>
                                    </div>
                                    <div>
                                        <span className="block text-gray-500 text-xs uppercase font-semibold">Date Of Birth</span>
                                        <span className="font-medium text-gray-900">{inquiry.dob ? formatDate(inquiry.dob) : '-'}</span>
                                    </div>

                                    {/* Row 3 */}
                                    <div>
                                        <span className="block text-gray-500 text-xs uppercase font-semibold">Last Name</span>
                                        <span className="font-medium text-gray-900">{inquiry.lastName || '-'}</span>
                                    </div>
                                    <div>
                                        <span className="block text-gray-500 text-xs uppercase font-semibold">Gender</span>
                                        <span className="font-medium text-gray-900">{inquiry.gender || '-'}</span>
                                    </div>

                                    {/* Row 4 */}
                                    <div>
                                        <span className="block text-gray-500 text-xs uppercase font-semibold">Contact No (H)</span>
                                        <span className="font-medium text-gray-900">{inquiry.contactHome || '-'}</span>
                                    </div>
                                    <div>
                                        <span className="block text-gray-500 text-xs uppercase font-semibold">Contact No (O)</span>
                                        <span className="font-medium text-gray-900">{'-'}</span>
                                    </div>

                                    {/* Row 5 */}
                                    <div>
                                        <span className="block text-gray-500 text-xs uppercase font-semibold">Mobile No</span>
                                        <span className="font-medium text-gray-900">{inquiry.contactStudent || '-'}</span>
                                    </div>
                                    <div>
                                        <span className="block text-gray-500 text-xs uppercase font-semibold">Parent Mobile</span>
                                        <span className="font-medium text-gray-900">{inquiry.contactParent || '-'}</span>
                                    </div>

                                    {/* Row 6 */}
                                    <div>
                                        <span className="block text-gray-500 text-xs uppercase font-semibold">Education</span>
                                        <span className="font-medium text-gray-900">{inquiry.education || '-'}</span>
                                    </div>
                                    <div>
                                        <span className="block text-gray-500 text-xs uppercase font-semibold">Course Name</span>
                                        <span className="font-medium text-gray-900">
                                            {inquiry.courseId?.name || inquiry.interestedCourse?.name || '-'}
                                        </span>
                                    </div>

                                    {/* Address full width */}
                                    <div className="md:col-span-2">
                                        <span className="block text-gray-500 text-xs uppercase font-semibold">Address</span>
                                        <span className="font-medium text-gray-900">{inquiry.address || '-'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Visiting Detail Section */}
                        <div>
                            <div className="bg-gray-50 p-2 font-bold text-blue-800 uppercase text-xs tracking-wider border-l-4 border-blue-500 mb-4">
                                Visiting Detail
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                                <div>
                                    <span className="block text-gray-500 text-xs uppercase font-semibold">Followup By</span>
                                    <span className="font-medium text-gray-900">{inquiry.followUpBy?.name || inquiry.followUpBy?.username || inquiry.allocatedTo?.name || '-'}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <span className="block text-gray-500 text-xs uppercase font-semibold">Visiting Date</span>
                                        <span className="font-medium text-gray-900">{formatDate(inquiry.inquiryDate)}</span>
                                    </div>
                                    <div>
                                        <span className="block text-gray-500 text-xs uppercase font-semibold">Visiting Time</span>
                                        <span className="font-medium text-gray-900">
                                            {inquiry.inquiryDate ? new Date(inquiry.inquiryDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                                        </span>
                                    </div>
                                </div>
                                <div className="md:col-span-2">
                                    <span className="block text-gray-500 text-xs uppercase font-semibold">Followup Detail</span>
                                    <div className="font-medium text-gray-900 italic whitespace-pre-wrap text-sm border p-2 rounded bg-gray-50 mt-1 max-h-40 overflow-y-auto">
                                        {inquiry.followUpDetails || 'No additional details'}
                                    </div>
                                </div>
                                <div className="md:col-span-2 mt-2 pt-2 border-t">
                                    <span className="block text-blue-600 text-xs uppercase font-semibold">Next Followup Schedule</span>
                                    <span className="font-bold text-gray-900">
                                        {inquiry.nextVisitingDate ? formatDate(inquiry.nextVisitingDate) + (inquiry.nextVisitingDate && new Date(inquiry.nextVisitingDate).toTimeString() !== '00:00:00 GMT+0530 (India Standard Time)' && new Date(inquiry.nextVisitingDate).toTimeString() !== '00:00:00 GMT+0000 (Coordinated Universal Time)' ? ' at ' + new Date(inquiry.nextVisitingDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '') : 'Not Scheduled'}
                                    </span>
                                    {inquiry.visitReason && <span className="text-gray-500 ml-2">({inquiry.visitReason})</span>}
                                </div>
                            </div>
                        </div>

                        {/* Follow-Up History & Timeline Section */}
                        <div>
                            <div className="bg-gray-50 p-2 font-bold text-blue-800 uppercase text-xs tracking-wider border-l-4 border-blue-500 mb-4 flex justify-between items-center">
                                <span>Follow-Up History Logs</span>
                                <span className="bg-blue-600 text-white text-[10px] px-2.5 py-1 rounded-full font-bold shadow-sm">
                                    Follow-ups: {followUpCount} {followUpCount === 1 ? 'time' : 'times'}
                                </span>
                            </div>

                            {historyList.length > 0 ? (
                                <div className="mt-4 relative border-l-2 border-blue-100 ml-4 pl-6 space-y-5">
                                    {historyList.map((hist, idx) => (
                                        <div key={hist._id || idx} className="relative animate-fadeIn">
                                            {/* Step Circle Node */}
                                            <div className="absolute -left-[35px] top-1 bg-blue-600 text-white rounded-full flex items-center justify-center w-6 h-6 border-2 border-white shadow-md text-[10px] font-bold">
                                                {idx + 1}
                                            </div>

                                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-150 hover:bg-gray-100/50 transition duration-150">
                                                {/* Header Line */}
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-gray-800 text-xs">
                                                            Follow-Up Date: {formatDate(hist.date)}
                                                        </span>
                                                        {hist.date && new Date(hist.date).toTimeString() !== '00:00:00 GMT+0530 (India Standard Time)' && new Date(hist.date).toTimeString() !== '00:00:00 GMT+0000 (Coordinated Universal Time)' && (
                                                            <span className="text-[10px] text-gray-500 font-medium">
                                                                at {new Date(hist.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-bold tracking-wider self-start sm:self-auto border ${
                                                        hist.status === 'Open' ? 'bg-green-100 text-green-700 border-green-200' :
                                                        hist.status === 'Recall' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                                                        hist.status === 'InProgress' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                                                        hist.status === 'Complete' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                                                        'bg-gray-100 text-gray-600 border-gray-200'
                                                    }`}>
                                                        {hist.status || 'Open'}
                                                    </span>
                                                </div>
                                                
                                                {/* Remarks Box */}
                                                <p className="text-gray-700 text-xs whitespace-pre-wrap font-sans bg-white p-2 rounded border border-gray-100 leading-relaxed shadow-sm">
                                                    {hist.remarks || 'No remarks recorded.'}
                                                </p>
                                                
                                                {/* Timestamp */}
                                                <div className="text-[9px] text-gray-400 mt-2 flex justify-between gap-2">
                                                    <span>Followup By: {hist.followUpBy?.name || hist.followUpBy?.username || '-'}</span>
                                                    <span>Logged: {new Date(hist.createdAt || hist.date).toLocaleString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-6 bg-gray-50 rounded-lg text-gray-500 italic text-xs border border-dashed border-gray-200">
                                    No follow-up history has been recorded yet.
                                </div>
                            )}
                        </div>

                        {/* Referencive Detail Section */}
                        <div>
                            <div className="bg-gray-50 p-2 font-bold text-blue-800 uppercase text-xs tracking-wider border-l-4 border-blue-500 mb-4">
                                Referencive Detail
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-3">
                                <div>
                                    <span className="block text-gray-500 text-xs uppercase font-semibold">Reference Name</span>
                                    <span className="font-medium text-gray-900">
                                        {inquiry.referenceDetail?.name || inquiry.referenceBy || inquiry.source || '-'}
                                    </span>
                                </div>
                                <div>
                                    <span className="block text-gray-500 text-xs uppercase font-semibold">Reference Mobile</span>
                                    <span className="font-medium text-gray-900">{inquiry.referenceDetail?.mobile || '-'}</span>
                                </div>
                                <div>
                                    <span className="block text-gray-500 text-xs uppercase font-semibold">Reference Address</span>
                                    <span className="font-medium text-gray-900">{inquiry.referenceDetail?.address || '-'}</span>
                                </div>
                            </div>
                        </div>

                    </div>

                    <div className="mt-8 pt-8 border-t text-center text-xs text-gray-400">
                        <p>Compass Education ERP System</p>
                    </div>

                    <style>{`
                        @media print {
                            body * {
                                visibility: hidden;
                            }
                            #print-content, #print-content * {
                                visibility: visible;
                            }
                            #print-content {
                                position: absolute;
                                left: 0;
                                top: 0;
                                width: 100%;
                            }
                            /* Tailwind override for modal centering in print */
                            .fixed {
                                position: static !important;
                            }
                        }
                    `}</style>
                </div>
            </div>
        </div>
    );
};

export default InquiryViewModal;
