import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import axios from 'axios';
import logo from '../../../assets/logo2.png';
import moment from 'moment';

const ExamResultPrint = () => {
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const type = searchParams.get('type') || 'Marksheet'; 

    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(true);

    const { user } = useSelector((state) => state.auth);

    const API_URL = `${import.meta.env.VITE_API_URL}/master/exam-result/`;

    useEffect(() => {
        const fetchResult = async () => {
            try {
                const { data } = await axios.get(API_URL + id, { withCredentials: true });
                setResult(data);
                setLoading(false);
            } catch (error) {
                console.error("Failed to fetch exam result", error);
                setLoading(false);
            }
        };
        fetchResult();
    }, [id]);

    const numberToWords = (num) => {
        const words = ["ZERO", "ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE"];
        return num.toString().split('').map(digit => words[parseInt(digit)]).join(' ');
    };

    const fullNumberToWords = (n) => {
        const nums = ["", "ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE", "TEN", "ELEVEN", "TWELVE", "THIRTEEN", "FOURTEEN", "FIFTEEN", "SIXTEEN", "SEVENTEEN", "EIGHTEEN", "NINETEEN"];
        const tens = ["", "", "TWENTY", "THIRTY", "FORTY", "FIFTY", "SIXTY", "SEVENTY", "EIGHTY", "NINETY"];
        if (n < 20) return nums[n];
        if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + nums[n % 10] : "");
        if (n < 1000) return nums[Math.floor(n / 100)] + " HUNDRED" + (n % 100 !== 0 ? " AND " + fullNumberToWords(n % 100) : "");
        if (n === 2018) return "TWO THOUSAND EIGHTEEN";
        if (n === 2019) return "TWO THOUSAND NINETEEN";
        if (n === 2020) return "TWO THOUSAND TWENTY";
        if (n === 2021) return "TWO THOUSAND TWENTY ONE";
        if (n === 2022) return "TWO THOUSAND TWENTY TWO";
        if (n === 2023) return "TWO THOUSAND TWENTY THREE";
        if (n === 2024) return "TWO THOUSAND TWENTY FOUR";
        if (n === 2025) return "TWO THOUSAND TWENTY FIVE";
        if (n === 2026) return "TWO THOUSAND TWENTY SIX";
        return n.toString();
    };

    const getDaySuffix = (day) => {
        if (day > 3 && day < 21) return 'th';
        switch (day % 10) {
            case 1: return "st";
            case 2: return "nd";
            case 3: return "rd";
            default: return "th";
        }
    };

    if (loading) return <div className="p-10 text-center">Loading result data...</div>;
    if (!result) return <div className="p-10 text-center text-red-500">Result not found</div>;

    const student = result.student;
    const exam = result.exam;
    const course = result.course;
    const subjects = exam?.timeTable || [];

    const issueDate = moment(result.createdAt);

    // Subjects with marks
    const marksData = result.subjectMarks && result.subjectMarks.length > 0 ? result.subjectMarks : subjects.map(s => ({
        subject: s.subject,
        theory: 0,
        practical: 0,
        total: 0,
        maxMarks: s.total || 100
    }));

    return (
        <div className="bg-gray-200 min-h-screen py-10 print:py-0 print:bg-white flex justify-center">
            {/* --- Web Only Controls --- */}
            <div className="fixed top-5 right-5 print:hidden flex gap-2 z-[100]">
                <button
                    onClick={() => window.print()}
                    className="bg-primary text-white px-6 py-2 rounded-full font-bold shadow-lg hover:scale-105 transition-transform"
                >
                    Print {type}
                </button>
            </div>

            <div className="bg-white w-[210mm] min-h-[297mm] shadow-2xl p-2 relative overflow-hidden print:shadow-none print:w-full print:m-0">
                
                {/* Decorative Golden Border */}
                <div className="absolute inset-2 border-[12px] border-[#D4AF37] pointer-events-none z-0"></div>
                <div className="absolute inset-[14px] border-[1px] border-[#D4AF37] pointer-events-none z-0"></div>
                
                {/* Floral corner decorations */}
                <div className="absolute top-0 left-0 w-24 h-24 border-t-[30px] border-l-[30px] border-[#D4AF37] rounded-tl-lg z-10 opacity-30"></div>
                <div className="absolute top-0 right-0 w-24 h-24 border-t-[30px] border-r-[30px] border-[#D4AF37] rounded-tr-lg z-10 opacity-30"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 border-b-[30px] border-l-[30px] border-[#D4AF37] rounded-bl-lg z-10 opacity-30"></div>
                <div className="absolute bottom-0 right-0 w-24 h-24 border-b-[30px] border-r-[30px] border-[#D4AF37] rounded-br-lg z-10 opacity-30"></div>

                <div className="relative z-20 p-8 pt-10">
                    
                    {/* Common Header */}
                    <div className="flex flex-col items-center mb-4">
                        <div className="flex items-center gap-4 mb-2">
                            <img src={logo} alt="Logo" className="h-24 w-24 object-contain" />
                            <div className="text-center">
                                <h1 className="text-5xl font-serif font-black text-[#D32F2F] tracking-tighter">Smart <span className="text-[#1976D2] font-normal italic">Institute</span></h1>
                                <div className="bg-[#1976D2] text-white text-[10px] px-2 py-0.5 rounded-sm mt-1 font-bold">
                                    Smart management analysis of relative technology
                                </div>
                            </div>
                        </div>
                        
                        <div className="text-center space-y-1">
                            <h3 className="text-[#D4AF37] font-bold text-lg leading-none">A National Computer Literacy Program</h3>
                            <p className="text-[11px] font-bold">Org. By AEF [Akksh Education Foundation] Regd. By Govt. of India</p>
                            <p className="text-[12px] font-serif italic text-blue-800">Regd. Under Govt. of India N.C.T. New Delhi, Reg. No. 443 India</p>
                            <p className="text-[11px] font-bold italic">This Program is appreciated by the Minister of information Science & Technology, Govt. of India.</p>
                            <p className="text-[#D32F2F] text-sm font-bold underline">An ISO 9001:2015 Certified Organization</p>
                        </div>
                    </div>

                    {type === 'Marksheet' ? (
                        /* ================= MARKSHEET FORMAT ================= */
                        <>
                            <div className="flex justify-end mb-4">
                                <p className="font-bold text-sm">Reg. No. {student?.regNo || 'N/A'}</p>
                            </div>

                            <div className="grid grid-cols-1 gap-1 mb-8 uppercase text-[15px] font-bold tracking-wide pl-2">
                                <div className="flex border-b border-dotted border-black pb-0.5">
                                    <span className="w-48">CANDIDATE NAME</span><span className="mr-2">:</span><span className="flex-grow">{student?.firstName} {student?.middleName} {student?.lastName}</span>
                                </div>
                                <div className="flex border-b border-dotted border-black pb-0.5">
                                    <span className="w-48">FATHER NAME</span><span className="mr-2">:</span><span className="flex-grow">SHRI {student?.middleName || '---'} {student?.lastName}</span>
                                </div>
                                <div className="flex border-b border-dotted border-black pb-0.5">
                                    <span className="w-48">COURSE</span><span className="mr-2">:</span><span className="flex-grow">{course?.name} ({course?.shortName || course?.name})</span>
                                </div>
                                <div className="flex border-b border-dotted border-black pb-0.5">
                                    <span className="w-48">DURATION</span><span className="mr-2">:</span><span className="flex-grow">{course?.duration} {course?.durationType}</span>
                                </div>
                                <div className="flex border-b border-dotted border-black pb-0.5">
                                    <span className="w-48">CENTRE</span><span className="mr-2">:</span><span className="flex-grow">GODADARA, SURAT</span>
                                </div>
                            </div>

                            <div className="text-center mb-4">
                                <h2 className="text-2xl font-black underline uppercase tracking-[0.2em] font-serif">STATEMENT OF MARKS</h2>
                            </div>

                            <div className="border-[1.5px] border-black">
                                <table className="w-full text-center border-collapse text-[11px] font-bold">
                                    <thead>
                                        <tr className="border-b border-black">
                                            <th className="border-r border-black p-1 w-10">NO.</th>
                                            <th className="border-r border-black p-1 text-left px-4">NAME OF THE SUBJECT</th>
                                            <th className="border-r border-black p-1 w-16">MAX. MARKS</th>
                                            <th className="border-r border-black p-0" colSpan="3">
                                                <div className="border-b border-black p-1">OBTAINED MARKS</div>
                                                <div className="flex">
                                                    <div className="w-1/3 border-r border-black p-1 text-[9px]">THEORY</div>
                                                    <div className="w-1/3 border-r border-black p-1 text-[9px]">PRACTICAL</div>
                                                    <div className="w-1/3 p-1 text-[9px]">TOTAL</div>
                                                </div>
                                            </th>
                                            <th className="border-r border-black p-1 w-24">OBTAINED MARKS IN WORD</th>
                                            <th className="p-1 w-24">SUBJECT WISE GRADE</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {marksData.map((subj, index) => {
                                            return (
                                                <tr key={index} className="border-b border-black h-10">
                                                    <td className="border-r border-black">{index + 1}</td>
                                                    <td className="border-r border-black text-left px-4 uppercase">{subj.subject?.name || 'SUBJECT ' + (index + 1)}</td>
                                                    <td className="border-r border-black">{subj.maxMarks || 100}</td>
                                                    <td className="border-r border-black w-[45px]">{subj.theory}</td>
                                                    <td className="border-r border-black w-[45px]">{subj.practical}</td>
                                                    <td className="border-r border-black w-[45px]">{subj.total}</td>
                                                    <td className="border-r border-black uppercase text-[9px]">{numberToWords(subj.total)}</td>
                                                    <td className="uppercase">{result.grade || 'FIRST'}</td>
                                                </tr>
                                            );
                                        })}
                                        <tr className="h-8 uppercase bg-gray-100">
                                            <td className="border-r border-black p-1 text-left px-4" colSpan="2">GRAND TOTAL OF MARKS OBTAINED OUT OF</td>
                                            <td className="border-r border-black p-1">{result.marksObtained} / {result.totalMarks}</td>
                                            <td className="border-r border-black p-1 text-right px-4 uppercase" colSpan="6">{fullNumberToWords(result.marksObtained)} ONLY</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            <div className="mt-4 border-[1.5px] border-black">
                                <table className="w-full text-center border-collapse text-[10px] font-bold uppercase">
                                    <thead>
                                        <tr className="border-b border-black">
                                            <th className="border-r border-black p-1">MONTH & YEAR OF EXAM</th>
                                            <th className="border-r border-black p-1">SR.NO. OF STATEMENT</th>
                                            <th className="border-r border-black p-1">TOTAL PRESENTS (%)</th>
                                            <th className="border-r border-black p-1">PERCENTAGE (%)</th>
                                            <th className="p-1">GRADE</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr className="h-8">
                                            <td className="border-r border-black">{moment(result.createdAt).format('MMMM - YYYY')}</td>
                                            <td className="border-r border-black">{result.somNumber || 'SOM-G' + result._id.slice(-5).toUpperCase()}</td>
                                            <td className="border-r border-black">DAYS 275 OUT OF 307 (89.50)</td>
                                            <td className="border-r border-black">{((result.marksObtained / result.totalMarks) * 100).toFixed(2)}</td>
                                            <td>{result.grade || 'DISTINCTION'}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </>
                    ) : (
                        /* ================= CERTIFICATE FORMAT ================= */
                        <div className="pt-4 px-4 flex flex-col items-center">
                            
                            <div className="w-full flex justify-between items-start mb-2">
                                <div className="flex-grow"></div>
                                <div className="flex flex-col items-end">
                                    <div className="w-28 h-32 border-2 border-[#D4AF37] p-1 mb-1">
                                        {student?.studentPhoto ? (
                                            <img src={student.studentPhoto.startsWith('http') ? student.studentPhoto : `${import.meta.env.VITE_IMAGE_URL}/${student.studentPhoto}`} alt="Student" className="w-full h-full object-cover" />
                                        ) : <div className="w-full h-full bg-gray-200 flex items-center justify-center text-[10px] text-gray-400">PHOTO</div>}
                                    </div>
                                    <p className="font-bold text-[11px] uppercase">Reg. No. {student?.regNo}</p>
                                </div>
                            </div>

                            <h1 className="text-7xl font-serif text-[#1A237E] mb-8" style={{ fontFamily: "'Old English Text MT', serif" }}>Certificate</h1>
                            
                            <div className="text-center space-y-4 font-serif italic text-xl text-gray-800 leading-relaxed">
                                <p className="text-2xl not-italic font-bold text-gray-600 mb-6">This credential is awarded to</p>
                                
                                <p className="text-4xl not-italic font-bold text-black mb-6" style={{ fontFamily: "'Times New Roman', serif" }}>
                                    {student?.firstName} {student?.middleName} {student?.lastName}
                                </p>
                                
                                <p className="px-10">
                                    D/o Shri {student?.middleName} {student?.lastName} On the {issueDate.date()}{getDaySuffix(issueDate.date())} day of the month {issueDate.format('MMMM')} <br />
                                    In the year {fullNumberToWords(issueDate.year())} for successfully completed a <br />
                                    {course?.duration} Months course in
                                </p>
                                
                                <p className="text-3xl not-italic font-black text-black underline decoration-double decoration-gray-400 underline-offset-8">
                                    {course?.name} ({course?.shortName || 'N/A'})
                                </p>
                                
                                <p>
                                    With {result.grade || 'First Class'} from our Godadara Surat Center
                                </p>
                                
                                <p className="text-lg font-bold not-italic">
                                    Course description given bellows these ares-
                                </p>
                            </div>

                            {/* Subjects List */}
                            <div className="grid grid-cols-2 gap-x-20 gap-y-1 mt-6 text-[15px] font-serif italic text-gray-700 w-full max-w-2xl px-10">
                                {subjects.length > 0 ? subjects.map((subj, i) => (
                                    <div key={i}>{i+1}- {subj.subject?.name || 'Subject ' + (i+1)}</div>
                                )) : (
                                    <>
                                        <div>1- Basic</div>
                                        <div>2- Desktop Publishing & (Modeling)</div>
                                        <div>3- Financial Accounting</div>
                                        <div>4- Programming in C, C++</div>
                                        <div>5- Internet & Seminar</div>
                                    </>
                                )}
                            </div>

                            <div className="w-full mt-12 pl-10 space-y-1 font-bold text-sm">
                                <p>Certificate No.: {result._id.slice(-4).toUpperCase()}</p>
                                <p>Date of issue : {issueDate.format('DD MMMM YYYY')}</p>
                            </div>
                        </div>
                    )}

                    {/* Common Footer */}
                    <div className="mt-6 flex justify-between items-start text-[11px] font-bold leading-tight px-4">
                        <div className="space-y-1 relative">
                            {type === 'Certificate' && (
                                <div className="absolute left-[-60px] top-[50%] -rotate-90 text-[10px] text-gray-400 whitespace-nowrap">
                                    {result.csrNumber || 'CSR-G' + result._id.slice(-5).toUpperCase()}
                                </div>
                            )}
                            
                            {type === 'Marksheet' && (
                                <div className="space-y-1 mb-8">
                                    <p>Date of issue : {issueDate.format('DD MMMM YYYY')}</p>
                                    <div className="max-w-xl text-[9px] font-normal leading-none italic opacity-70">
                                        <span className="font-bold">GRADE:</span> Grade Distinction 80% above, Grade First 60% and above, but below 80%, Grade Second 50% and above, <br />
                                        but below 60%, Grade Third 34% and above, but below 50%, Grade Fail 34% and below
                                    </div>
                                </div>
                            )}
                            
                            <div className="flex gap-4 mt-8">
                                <div className="text-center w-40 border-t-[1.5px] border-black pt-1">Centre Seal & Signature</div>
                                <div className="flex gap-2 items-end">
                                    <div className="w-10 h-10 border-2 border-red-800 rounded-full flex items-center justify-center text-[7px] font-black text-red-800 border-double rotate-[-15deg]">AEF SEAL</div>
                                    <div className="w-10 h-10 border-2 border-blue-800 rounded-full flex items-center justify-center text-[7px] font-black text-blue-800 border-double rotate-[15deg]">AISDC SEAL</div>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col items-center">
                             <div className="relative w-24 h-24 mb-4">
                                <div className="absolute inset-0 bg-[#D4AF37] rounded-full flex items-center justify-center border-4 border-white shadow-lg overflow-hidden">
                                    <div className="text-center">
                                        <div className="text-[10px] font-black text-white">SMART</div>
                                        <div className="text-[15px] text-white">★★★</div>
                                        <div className="text-[8px] text-white font-bold">INSTITUTE</div>
                                    </div>
                                </div>
                             </div>
                             <div className="text-center w-40 border-t-[1.5px] border-black pt-1">Managing Director</div>
                        </div>
                    </div>

                    <div className="mt-10 pt-2 border-t border-gray-300 text-center text-[8px] font-bold text-gray-500 uppercase">
                        <p>Issued by : Smart Institute having its registered office at</p>
                        <p>H.O.: 1st & 2nd Floor, 50 Kuber Nagar, Nilgiri Road, Aas-Pass Circle, Godadara, Surat 395 010, Gujarat (INDIA)</p>
                        <p>Website : www.smartinstitute.co.in &nbsp; E-mail: smartinstitute@ymail.com</p>
                    </div>

                </div>

                {/* Watermark */}
                <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none rotate-[-30deg] z-0">
                    <img src={logo} alt="Watermark" className="w-[500px]" />
                </div>
            </div>

            <style type="text/css" media="print">
                {`
                    @page { size: A4; margin: 0; }
                    body { -webkit-print-color-adjust: exact; }
                `}
            </style>
        </div>
    );
};

export default ExamResultPrint;
