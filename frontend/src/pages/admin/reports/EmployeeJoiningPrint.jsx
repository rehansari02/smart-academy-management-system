import React, { useState, useEffect } from 'react';
import { getBranches } from '../../../features/master/branchSlice';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import logo from '../../../assets/logo2.png';
import moment from 'moment';
import { Printer, ArrowLeft, Check, Square } from 'lucide-react';

const Editable = ({ value, onChange, className = "" }) => {
    return (
        <span
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) => onChange && onChange(e.target.innerText)}
            className={`inline-block border-b border-dotted border-gray-400 hover:border-black focus:border-blue-500 outline-none px-1 min-w-[30px] ${className}`}
        >
            {value || ""}
        </span>
    );
};

const CheckBox = ({ label, checked }) => (
    <div className="flex items-center gap-1 inline-flex ml-2">
        {checked ? <Check size={14} className="border border-black" /> : <Square size={14} className="border border-black" />}
        <span className="text-[11px] font-normal">{label}</span>
    </div>
);

const EmployeeJoiningPrint = () => {
    const dispatch = useDispatch();
    const location = useLocation();
    const navigate = useNavigate();
    const [employee, setEmployee] = useState(location.state?.employee);
    const { branches } = useSelector((state) => state.branch);
    
    useEffect(() => {
        if (location.state?.employee) {
            setEmployee(location.state.employee);
        }
    }, [location.state]);

    useEffect(() => {
        if (!branches || branches.length === 0) {
            dispatch(getBranches());
        }
    }, [dispatch, branches]);

    const branchInfo = branches?.find(b => b._id === (employee?.branchId?._id || employee?.branchId)) || {};

    if (!employee) {
        return (
            <div className="p-10 text-center">
                <h2 className="text-xl font-bold text-red-600">No Employee Selected</h2>
                <button onClick={() => navigate(-1)} className="mt-4 bg-blue-600 text-white px-4 py-2 rounded">Go Back</button>
            </div>
        );
    }

    return (
        <div className="bg-gray-200 min-h-screen pb-10 print:bg-white print:pb-0">
            {/* Action Bar - Hidden on Print */}
            <div className="sticky top-0 z-50 bg-white/80 backdrop-blur shadow-sm p-4 mb-6 print:hidden flex justify-between items-center max-w-4xl mx-auto rounded-b-xl border-x border-b border-gray-300">
                <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-600 hover:text-black font-medium">
                    <ArrowLeft size={18} /> Back to Master
                </button>
                <div className="flex items-center gap-6">
                    <span className="text-xs font-semibold text-blue-600 animate-pulse uppercase tracking-wider">Editor Mode Active</span>
                    <button 
                        onClick={() => window.print()}
                        className="bg-slate-900 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-black transition shadow-lg active:scale-95"
                    >
                        <Printer size={18} /> Print Document
                    </button>
                </div>
            </div>

            {/* A4 Document Container */}
            <div className="print-container bg-white mx-auto shadow-2xl print:shadow-none w-[210mm] min-h-[297mm] p-[10mm] relative text-black font-serif leading-tight">
                
                {/* Main Outer Border */}
                <div className="border-[2px] border-black h-full min-h-[275mm] p-6 relative">
                    
                    {/* Header Section */}
                    <div className="flex justify-between items-center mb-4">
                        <img src={logo} alt="Logo" className="h-16 object-contain" />
                        <div className="text-right">
                            <h2 className="text-xl font-bold text-gray-800">
                                {branchInfo.name || employee?.branchName || "Main Branch"}
                            </h2>
                            <p className="text-[10px] italic">Smart Education Solutions</p>
                        </div>
                    </div>

                    <div className="border-t border-black mb-6"></div>

                    {/* Centered Title */}
                    <div className="flex justify-center mb-8">
                        <div className="border-2 border-black p-0.5">
                            <div className="bg-black text-white px-10 py-1.5 text-lg font-bold uppercase tracking-[0.2em]">
                                Agreement of Joining
                            </div>
                        </div>
                    </div>

                    {/* Passport Photo Placeholder */}
                    <div className="absolute right-10 top-48 w-32 h-40 border border-black flex items-center justify-center bg-gray-50 z-10">
                        {employee?.photo ? (
                            <img 
                                src={employee.photo.startsWith('http') ? employee.photo : `http://localhost:5000/${employee.photo}`} 
                                alt="Employee" 
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="text-[9px] text-gray-400 font-bold text-center p-4 uppercase">Affix Recent Passport Size Photograph</div>
                        )}
                    </div>

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-1 gap-y-5 text-[13px] w-2/3 mb-10">
                        <div className="flex gap-2">
                            <span className="font-bold min-w-[100px]">Staff Code:</span>
                            <Editable value={employee?.regNo} className="flex-grow border-b border-black font-bold" />
                        </div>
                        <div className="flex gap-2">
                            <span className="font-bold min-w-[100px]">Designation:</span>
                            <Editable value={employee?.type} className="flex-grow border-b border-black" />
                        </div>
                        <div className="flex gap-2">
                            <span className="font-bold min-w-[100px]">Date of Joining:</span>
                            <Editable value={employee?.dateOfJoining ? moment(employee.dateOfJoining).format('DD/MM/YYYY') : ""} className="flex-grow border-b border-black" />
                        </div>
                    </div>

                    {/* Personal Details Section */}
                    <div className="space-y-6 text-[13px]">
                        <div className="flex gap-2 items-end">
                            <span className="font-bold uppercase">Name of the Employee:</span>
                            <Editable value={employee?.name?.toUpperCase()} className="flex-grow border-b border-black font-bold text-sm" />
                        </div>

                        <div className="flex gap-4 items-end">
                            <span className="font-bold">Date of Birth:</span>
                            <Editable value={employee?.dob ? moment(employee.dob).format('DD/MM/YYYY') : ""} className="w-40 border-b border-black" />
                            <span className="font-bold ml-4">Contact No:</span>
                            <Editable value={employee?.mobile} className="w-48 border-b border-black font-bold" />
                        </div>

                        <div className="flex gap-2 items-end">
                            <span className="font-bold">Email Address:</span>
                            <Editable value={employee?.email} className="flex-grow border-b border-black" />
                        </div>

                        <div className="flex gap-2 items-start">
                            <span className="font-bold uppercase min-w-fit mt-1">Permanent Address:</span>
                            <Editable value={employee?.address} className="flex-grow border-b border-black leading-relaxed" />
                        </div>

                        {/* Reference Details */}
                        <div className="pt-4 flex gap-8 items-end border-t border-dotted border-gray-300">
                            <div className="flex gap-2 items-end flex-grow">
                                <span className="font-bold whitespace-nowrap">REFERENCE NAME:</span>
                                <Editable value={employee?.referName} className="flex-grow border-b border-black font-bold uppercase" />
                            </div>
                            <div className="flex gap-2 items-end w-1/3">
                                <span className="font-bold whitespace-nowrap">MOB. NO:</span>
                                <Editable value={employee?.referMobile} className="flex-grow border-b border-black font-bold" />
                            </div>
                        </div>
                    </div>

                    {/* Terms & Conditions Section */}
                    <div className="mt-12 border-t border-black pt-4">
                        <h4 className="font-bold underline mb-3 text-[14px]">Terms & Conditions of Employment:</h4>
                        <ul className="list-decimal ml-6 space-y-2 text-[11px] text-justify leading-snug">
                            <li>Identity card must be worn at all times during duty hours (08:00 AM to 09:00 PM).</li>
                            <li>Incentives are strictly performance-based and calculated at the end of each calendar month.</li>
                            <li>Incentive structure: 2.80% of the total course fees collected per student enrollment.</li>
                            <li>No conveyance allowance will be provided. Advance salary or incentives are not permitted.</li>
                            <li>Incentive will be payable as per student paid fees amount at the end of Month.</li>
                            <li>In case of any absence/leave, submit a formal leave application for approval.</li>
                            <li>Promotion and designation upgrades are solely based on periodic performance reviews.</li>
                            <li>The management reserves the right to suspend employment for any violation of institute policy.</li>
                            <li>Mandatory commitment period: <CheckBox label="1 Year Training" /> <CheckBox label="2 Year Job" /></li>
                            <li>We will not accept any type of claim or legal action for our management.</li>
                            <li>Compliance with all <span className="font-bold">SMART Institute</span> internal rules is mandatory.</li>
                        </ul>
                    </div>

                    {/* Declaration */}
                    <div className="mt-10 text-[12px] leading-relaxed italic border-l-4 border-gray-300 pl-4">
                        <p>
                            I, <Editable value={employee.name?.toUpperCase()} className="min-w-[200px] border-b border-black font-bold not-italic" />, 
                            hereby declare that the information provided above is true to the best of my knowledge. 
                            I accept the terms and conditions of Smart Institute and understand that I am responsible 
                            for any disciplinarian action.
                        </p>
                    </div>

                    {/* Footer / Signatures */}
                    <div className="absolute bottom-10 left-6 right-6 flex justify-between items-end font-bold text-[12px]">
                        <div className="text-center">
                            <div className="w-40 border-t border-black pt-1">Employee Signature</div>
                        </div>
                        <div className="text-center">
                            <div className="w-40 border-t border-black pt-1">Managing Director</div>
                        </div>
                    </div>

                </div>
            </div>

            <style>
                {`
                    @media print {
                        @page {
                            size: A4;
                            margin: 0;
                        }
                        body {
                            background: white !important;
                            margin: 0;
                            padding: 0;
                        }
                        .print-container {
                            width: 210mm;
                            height: 297mm;
                            padding: 10mm;
                            margin: 0 !important;
                            border: none !important;
                        }
                        * {
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                        }
                        .print\\:hidden {
                            display: none !important;
                        }
                    }
                `}
            </style>
        </div>
    );
};

export default EmployeeJoiningPrint;