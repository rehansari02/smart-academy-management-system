import React, { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import axios from "axios";
import moment from "moment";
import { QRCodeSVG } from "qrcode.react";

import markshettkl from "../../../assets/marksheetrhen.png";
import certificateImg from "../../../assets/certificate.png";

const ExamResultPrint = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const type = searchParams.get("type") || "Marksheet";

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);

  const API_URL = `${import.meta.env.VITE_API_URL}/master/exam-result/`;

  const formatSomNumber = (value) => {
    const somNumber = String(value || "").trim();
    if (!somNumber) return "SOM-G0035";
    return `SOM-${somNumber.replace(/^(SOM-)+/i, "").replace(/^(LEGACY-)+/i, "")}`;
  };

  const formatCertificateNumber = (somNumber) =>
    formatSomNumber(somNumber).replace(/^SOM-/i, "CSR-");

  useEffect(() => {
    const fetchResult = async () => {
      try {
        const { data } = await axios.get(API_URL + id, {
          withCredentials: true,
        });
        setResult(data);
        setLoading(false);
      } catch (error) {
        console.error("Failed to fetch exam result", error);
        setLoading(false);
      }
    };
    fetchResult();
  }, [id]);

  // Translate numbers to words (e.g. 66 -> "SIX SIX")
  const numberToWords = (num) => {
    if (num === "-" || num === undefined || num === null || num === "")
      return "";
    let str = num.toString();
    if (str.length === 1 && !isNaN(num)) {
      str = "0" + str;
    }
    const words = [
      "ZERO",
      "ONE",
      "TWO",
      "THREE",
      "FOUR",
      "FIVE",
      "SIX",
      "SEVEN",
      "EIGHT",
      "NINE",
    ];
    return str
      .split("")
      .map((digit) => {
        const parsed = parseInt(digit);
        return isNaN(parsed) ? digit : words[parsed];
      })
      .join(" ");
  };

  // Full english translation of grand totals
  const fullNumberToWords = (num) => {
    if (num === 0) return "ZERO";
    if (!num || isNaN(num)) return "";
    const ones = [
      "",
      "ONE",
      "TWO",
      "THREE",
      "FOUR",
      "FIVE",
      "SIX",
      "SEVEN",
      "EIGHT",
      "NINE",
      "TEN",
      "ELEVEN",
      "TWELVE",
      "THIRTEEN",
      "FOURTEEN",
      "FIFTEEN",
      "SIXTEEN",
      "SEVENTEEN",
      "EIGHTEEN",
      "NINETEEN",
    ];
    const tens = [
      "",
      "",
      "TWENTY",
      "THIRTY",
      "FORTY",
      "FIFTY",
      "SIXTY",
      "SEVENTY",
      "EIGHTY",
      "NINETY",
    ];

    const convertLessThanOneThousand = (n) => {
      if (n < 20) return ones[n];
      const tempTens = tens[Math.floor(n / 10)];
      const tempOnes = ones[n % 10];
      const separator = tempTens && tempOnes ? " " : "";
      if (n < 100) return tempTens + separator + tempOnes;

      const hundred = ones[Math.floor(n / 100)] + " HUNDRED";
      const remainder = n % 100;
      if (remainder > 0) {
        return hundred + " " + convertLessThanOneThousand(remainder);
      }
      return hundred;
    };

    return convertLessThanOneThousand(num);
  };

  const yearToWords = (year) => {
    if (!year || isNaN(year)) return "";
    if (year === 2018) return "Two Thousand Eighteen";
    if (year === 2019) return "Two Thousand Nineteen";
    if (year === 2026) return "Two Thousand Twenty Six";

    if (year >= 2000 && year < 2100) {
      const ones = [
        "",
        "One",
        "Two",
        "Three",
        "Four",
        "Five",
        "Six",
        "Seven",
        "Eight",
        "Nine",
        "Ten",
        "Eleven",
        "Twelve",
        "Thirteen",
        "Fourteen",
        "Fifteen",
        "Sixteen",
        "Seventeen",
        "Eighteen",
        "Nineteen",
      ];
      const tens = [
        "",
        "",
        "Twenty",
        "Thirty",
        "Forty",
        "Fifty",
        "Sixty",
        "Seventy",
        "Eighty",
        "Ninety",
      ];
      const remainder = year % 100;
      if (remainder === 0) return "Two Thousand";
      if (remainder < 20) return "Two Thousand " + ones[remainder];
      const tempTens = tens[Math.floor(remainder / 10)];
      const tempOnes = ones[remainder % 10];
      const separator = tempTens && tempOnes ? " " : "";
      return "Two Thousand " + tempTens + separator + tempOnes;
    }
    return fullNumberToWords(year);
  };

  const toTitleCase = (value) => {
    const text = String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
    if (!text) return "";
    return text.replace(/\b([a-z])/g, (match) => match.toUpperCase());
  };

  const toUpperText = (value) =>
    String(value || "").trim().replace(/\s+/g, " ").toUpperCase();

  const getStudentFullName = () =>
    [student?.firstName, student?.lastName]
      .map(toTitleCase)
      .filter(Boolean)
      .join(" ");

  const getParentFullName = () =>
    [student?.fatherName || student?.middleName, student?.lastName]
      .map(toTitleCase)
      .filter(Boolean)
      .join(" ");

  const getUpperFullName = (...parts) =>
    parts.map(toUpperText).filter(Boolean).join(" ");

  // Calculate subject-wise grade dynamically matching overall criteria
  const getSubjectGrade = (obtained, max) => {
    if (obtained === "-" || !max || isNaN(obtained)) return "-";
    const pct = max > 0 ? (obtained / max) * 100 : 0;
    if (pct >= 80) return "DISTINCTION";
    if (pct >= 60) return "FIRST";
    if (pct >= 50) return "SECOND";
    if (pct >= 34) return "THIRD";
    return "FAIL";
  };

  // Helper to determine max marks based on subject name or table index
  const getMaxMarks = (name, index, totalItems) => {
    const n = (name || "").toUpperCase();

    // Explicit name checks are safest
    if (
      n.includes("PROJECT") ||
      n.includes("DISCIPLINE") ||
      n.includes("DESCIPLINE")
    ) {
      return 50;
    }

    // If it's one of the last two items in a standard curriculum, it's likely 50 marks
    if (
      totalItems >= 6 &&
      (index === totalItems - 1 || index === totalItems - 2)
    ) {
      // But only if it's not a standard subject name that we know is 100
      const isStandard100 =
        n.includes("BASIC") ||
        n.includes("TALLY") ||
        n.includes("DTP") ||
        n.includes("HTML") ||
        n.includes("INTERNET");
      if (!isStandard100) return 50;
    }

    return 100;
  };

  // Helper to get matching subject details (name + subtext) based on input
  const getSubjectDetails = (name, index) => {
    const n = (name || "").toUpperCase();

    const defaults = [
      {
        name: "BASIC (I)",
        subtext: "Os-XP/Windows7, Dos, Word, Excel, Powerpoint",
      },
      { name: "H.T.M.L. (II)", subtext: "Hyper Text Markup Language" },
      { name: "TALLY (III)", subtext: "Tally.9, Tally ERP.9" },
      {
        name: "DESKTOP PUBLISHING- D.T.P. (IV)",
        subtext: "Photoshop Cs3, Corel Draw, Pagemaker",
      },
      { name: "INTERNET & SEMINAR (V)", subtext: "Internet & Seminar" },
      { name: "PROJECT", subtext: "" },
      { name: "DISCIPLINE", subtext: "" },
    ];

    // Match common roman numerals/indicators
    if (n === "(I)" || n === "I") return defaults[0];
    if (n === "(II)" || n === "II") return defaults[1];
    if (n === "(III)" || n === "III") return defaults[2];
    if (n === "(IV)" || n === "IV") return defaults[3];
    if (n === "(V)" || n === "V") return defaults[4];
    if (n === "PROJECT") return defaults[5];
    if (n === "DISCIPLINE" || n === "DESCIPLINE") return defaults[6];

    // Intelligent keywords match
    let matchedName = n;
    let matchedSubtext = "";
    if (n.includes("BASIC")) {
      matchedName = "BASIC (I)";
      matchedSubtext = defaults[0].subtext;
    } else if (
      n.includes("HTML") ||
      n.includes("MARKUP") ||
      n.includes("H.T.M.L")
    ) {
      matchedName = "H.T.M.L. (II)";
      matchedSubtext = defaults[1].subtext;
    } else if (n.includes("TALLY")) {
      matchedName = "TALLY (III)";
      matchedSubtext = defaults[2].subtext;
    } else if (
      n.includes("DESKTOP") ||
      n.includes("DTP") ||
      n.includes("PUBLISHING")
    ) {
      matchedName = "DESKTOP PUBLISHING- D.T.P. (IV)";
      matchedSubtext = defaults[3].subtext;
    } else if (n.includes("INTERNET") || n.includes("SEMINAR")) {
      matchedName = "INTERNET & SEMINAR (V)";
      matchedSubtext = defaults[4].subtext;
    } else if (n.includes("PROJECT")) {
      matchedName = "PROJECT";
      matchedSubtext = "";
    } else if (n.includes("DISCIPLINE") || n.includes("DESCIPLINE")) {
      matchedName = "DISCIPLINE";
      matchedSubtext = "";
    } else {
      if (index >= 0 && index < defaults.length) {
        return defaults[index];
      }
    }
    return { name: matchedName, subtext: matchedSubtext };
  };

  const formatMark = (val) => {
    if (val === "-" || val === undefined || val === null || val === "")
      return "";
    return val;
  };

  if (loading)
    return (
      <div className="p-10 text-center text-slate-500 font-semibold">
        Loading result data...
      </div>
    );
  if (!result)
    return (
      <div className="p-10 text-center text-red-500 font-bold">
        Result not found
      </div>
    );

  const student = result.student;
  const exam = result.exam;
  const course = result.course;

  // Determine Center Name based on student branch
  const getCenterName = () => {
    const branchName = student?.branchName || "";
    if (branchName.toUpperCase().includes("BHESTAN")) return "BHESTAN, SURAT";
    if (branchName.toUpperCase().includes("GODADARA")) return "GODADARA, SURAT";
    if (branchName) return `${branchName.toUpperCase()}, SURAT`;
    return toUpperText(course?.centerName || "GODADARA, SURAT");
  };

  const issueDate = moment(result.issueDate || result.createdAt);
  const marksObtained = Number(result.marksObtained || 0);
  const totalMarks = Number(result.totalMarks || 0);
  const marksPercentage =
    result.percentage ||
    (totalMarks > 0 ? ((marksObtained / totalMarks) * 100).toFixed(2) : "0.00");
  const totalPresentsText =
    result.totalPresentsText ||
    result.attendanceSummary?.totalPresentsText ||
    "";

  // Robust marksData construction: Combine exam timetable with saved marks
  // This ensures all subjects from the exam are shown, plus any specific marks recorded.
  const timetable = exam?.timeTable || [];
  const savedMarks = result.subjectMarks || [];

  // Create a map of saved marks by subject ID for quick lookup
  const savedMarksMap = new Map();
  savedMarks.forEach((sm) => {
    const id = (sm.subject?._id || sm.subject)?.toString();
    if (id) savedMarksMap.set(id, sm);
  });

  let marksData = [];
  if (timetable.length > 0) {
    // Use timetable as base to maintain correct order and ensure all subjects are listed
    marksData = timetable.map((tt) => {
      const id = (tt.subject?._id || tt.subject)?.toString();
      const sm = savedMarksMap.get(id);
      return {
        subject: tt.subject,
        subjectName:
          tt.subject?.name ||
          tt.subjectName ||
          sm?.subjectName ||
          sm?.name ||
          "",
        theory: sm?.theory ?? "-",
        practical: sm?.practical ?? "-",
        total: sm?.total ?? "-",
        maxMarks: tt.total || sm?.maxMarks || 0,
      };
    });

    // Add any subjects from savedMarks that weren't in the timetable (rare edge case)
    savedMarks.forEach((sm) => {
      const id = (sm.subject?._id || sm.subject)?.toString();
      if (
        id &&
        !timetable.some(
          (tt) => (tt.subject?._id || tt.subject)?.toString() === id,
        )
      ) {
        marksData.push({
          subject: sm.subject,
          subjectName: sm.subject?.name || sm.subjectName || sm.name || "",
          theory: sm.theory,
          practical: sm.practical,
          total: sm.total,
          maxMarks: sm.maxMarks || 0,
        });
      }
    });
  } else {
    // Fallback to saved marks only if timetable is unavailable
    marksData = savedMarks.map((sm) => ({
      subject: sm.subject,
      subjectName: sm.subject?.name || sm.subjectName || sm.name || "",
      theory: sm.theory,
      practical: sm.practical,
      total: sm.total,
      maxMarks: sm.maxMarks || 0,
    }));
  }

  // --- Dynamic Layout Calculations for Marksheet ---
  const numSubjects = marksData.length;
  let rowHeight = "10.2mm";
  let snameFontSize = "10px";
  let ssubFontSize = "7px";
  let tableFontSize = "9.5px";
  let spacerHeight = "2mm";
  let headingMarginTop = "2mm";
  let headingMarginBottom = "2mm";
  let detailsMarginBottom = "3mm";
  let botTableHeight = "10mm";
  let botTableFontSize = "9px";
  let dateIssueMarginTop = "4mm";

  if (numSubjects > 6) {
    // More aggressive scaling to fit into the pre-printed space
    const overflow = numSubjects - 6;
    // Target: fit numSubjects into the space of 6 rows (approx 61mm)
    const calculatedHeight = 61 / numSubjects;
    rowHeight = `${Math.max(6.5, calculatedHeight)}mm`;

    snameFontSize = `${Math.max(7, 10 - overflow * 0.7)}px`;
    ssubFontSize = `${Math.max(5.5, 7 - overflow * 0.3)}px`;
    tableFontSize = `${Math.max(7.5, 9.5 - overflow * 0.4)}px`;

    spacerHeight = `${Math.max(1, 4 - overflow * 0.5)}mm`;
    headingMarginTop = `${Math.max(0.5, 3 - overflow * 0.5)}mm`;
    headingMarginBottom = `${Math.max(0.5, 3 - overflow * 0.5)}mm`;
    detailsMarginBottom = `${Math.max(1, 3.5 - overflow * 0.5)}mm`;

    botTableHeight = `${Math.max(6, 10 - overflow * 0.8)}mm`;
    botTableFontSize = `${Math.max(7, 9 - overflow * 0.5)}px`;
    dateIssueMarginTop = `${Math.max(2, 4 - overflow * 0.5)}mm`;
  }

  const isFemaleStudent = student?.gender?.toLowerCase() === "female";
  const isHusbandRelation = student?.relationType?.toLowerCase() === "husband";
  const getStudentPrefix = (uppercase = false) => {
    const prefix =
      isFemaleStudent && isHusbandRelation
        ? "Mrs."
        : isFemaleStudent
        ? "Miss."
        : "Mr.";
    return uppercase ? prefix.toUpperCase() : prefix;
  };
  const studentPrefix = getStudentPrefix();
  const marksheetStudentPrefix = getStudentPrefix(true);
  const parentRelationLabel = isHusbandRelation ? "HUSBAND NAME" : "FATHER NAME";
  const fatherPrefix = "SHRI";
  const marksheetStudentName = getUpperFullName(
    student?.firstName,
    student?.lastName
  );
  const marksheetParentName = getUpperFullName(
    student?.fatherName || student?.middleName,
    student?.lastName
  );
  const marksheetCourseName = toUpperText(course?.name);
  const marksheetDuration = toUpperText(
    `${course?.duration || "12"} ${course?.durationType || "MONTH"}`
  );
  const displayResultGrade = toUpperText(result.grade || "DISTINCTION");

  return (
    <div className="bg-slate-500 min-h-screen py-10 print:py-0 print:bg-white flex flex-col items-center font-sans text-slate-900">
      {/* --- Web Print Control Bar --- */}
      <div className="fixed top-5 right-5 print:hidden flex gap-2 z-[100]">
        <button
          onClick={() => window.print()}
          className="bg-[#1565C0] text-white px-8 py-2.5 rounded-full font-extrabold shadow-lg hover:scale-105 transition-transform"
        >
          🖨️ Print {type}
        </button>
      </div>

      {/* --- A4 Print Sheet --- */}
      <div className="sheet bg-white w-[210mm] h-[297mm] relative overflow-hidden print:w-[210mm] print:h-[297mm] print:m-0 print:shadow-none shadow-2xl box-border">
        {type === "Marksheet" ? (
          <>
            {/* Background pre-printed template image */}
            <img
              src={markshettkl}
              alt="Marksheet Template Background"
              className="bg-img"
            />

            {/* Content Container Flow positioned inside the golden frame backdrop */}
            <div
              style={{
                position: "absolute",
                top: "70.8mm",
                left: "17.5mm",
                width: "175.5mm",
                display: "flex",
                flexDirection: "column",
                zIndex: 10,
                boxSizing: "border-box",
              }}
            >
              {/* Register No on its own line, floated to the right */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  width: "100%",
                  marginBottom: "1.5mm",
                  fontFamily: "Arial, sans-serif",
                  color: "#000",
                }}
              >
                <div
                  style={{
                    fontSize: "3.8mm",
                    fontWeight: "900",
                    textAlign: "right",
                    paddingRight: "2mm",
                    whiteSpace: "nowrap",
                  }}
                >
                  Reg. No. {student?.regNo || "398/SUR"}
                </div>
              </div>

              {/* Candidate Details Grid below Register No */}
              <div
                style={{
                  width: "100%",
                  marginBottom: detailsMarginBottom,
                  fontFamily: "Arial, sans-serif",
                  color: "#000",
                }}
              >
                <table
                  style={{
                    borderCollapse: "collapse",
                    border: "none",
                    textAlign: "left",
                    width: "100%",
                    background: "transparent",
                  }}
                >
                  <tbody>
                    <tr style={{ height: "5.2mm" }}>
                      <td
                        style={{
                          width: "22%",
                          border: "none",
                          fontWeight: "900",
                          padding: 0,
                          fontSize: "3.5mm",
                        }}
                      >
                        CANDIDATE NAME
                      </td>
                      <td
                        style={{
                          border: "none",
                          fontWeight: "900",
                          padding: 0,
                          fontSize: "3.5mm",
                        }}
                      >
                        : {marksheetStudentPrefix} {marksheetStudentName}
                      </td>
                    </tr>
                    <tr style={{ height: "5.2mm" }}>
                      <td
                        style={{
                          border: "none",
                          fontWeight: "900",
                          padding: 0,
                          fontSize: "3.5mm",
                        }}
                      >
                        {parentRelationLabel}
                      </td>
                      <td
                        style={{
                          border: "none",
                          fontWeight: "900",
                          padding: 0,
                          fontSize: "3.5mm",
                        }}
                      >
                        : {fatherPrefix} {marksheetParentName}
                      </td>
                    </tr>
                    <tr style={{ height: "5.2mm" }}>
                      <td
                        style={{
                          border: "none",
                          fontWeight: "900",
                          padding: 0,
                          fontSize: "3.5mm",
                        }}
                      >
                        COURSE
                      </td>
                      <td
                        style={{
                          border: "none",
                          fontWeight: "900",
                          padding: 0,
                          fontSize: "3.5mm",
                        }}
                      >
                        : {marksheetCourseName}
                      </td>
                    </tr>
                    <tr style={{ height: "5.2mm" }}>
                      <td
                        style={{
                          border: "none",
                          fontWeight: "900",
                          padding: 0,
                          fontSize: "3.5mm",
                        }}
                      >
                        DURATION
                      </td>
                      <td
                        style={{
                          border: "none",
                          fontWeight: "900",
                          padding: 0,
                          fontSize: "3.5mm",
                        }}
                      >
                        : {marksheetDuration}
                      </td>
                    </tr>
                    <tr style={{ height: "5.2mm" }}>
                      <td
                        style={{
                          border: "none",
                          fontWeight: "900",
                          padding: 0,
                          fontSize: "3.5mm",
                        }}
                      >
                        CENTRE
                      </td>
                      <td
                        style={{
                          border: "none",
                          fontWeight: "900",
                          padding: 0,
                          fontSize: "3.5mm",
                        }}
                      >
                        : {toUpperText(getCenterName())}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Center Align STATEMENT OF MARKS heading with custom spacing and underline */}
              <div
                style={{
                  width: "100%",
                  textAlign: "center",
                  fontSize: "5mm",
                  fontWeight: "900",
                  color: "#000",
                  letterSpacing: "0.8px",
                  fontFamily: "Arial, sans-serif",
                  marginTop: headingMarginTop,
                  marginBottom: headingMarginBottom,
                  textDecoration: "underline",
                }}
              >
                STATEMENT OF MARKS
              </div>

              {/* MAIN MARKS TABLE (Native two-row header with rowspan/colspan to ensure perfect vertical borders) */}
              <div
                className="tbl-wrap"
                style={{
                  position: "relative",
                  top: "auto",
                  left: "auto",
                  width: "100%",
                  zIndex: 10,
                }}
              >
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: tableFontSize,
                  }}
                >
                  <thead>
                    <tr style={{ height: "6.5mm" }}>
                      <th
                        rowSpan="2"
                        style={{
                          width: "8%",
                          border: "1px solid #000",
                          fontWeight: "900",
                          fontSize: "8.8px",
                        }}
                      >
                        SR NO.
                      </th>
                      <th
                        rowSpan="2"
                        style={{
                          width: "30%",
                          border: "1px solid #000",
                          fontWeight: "900",
                          fontSize: "8.8px",
                        }}
                      >
                        NAME OF THE SUBJECT
                      </th>
                      <th
                        rowSpan="2"
                        style={{
                          width: "8%",
                          border: "1px solid #000",
                          fontWeight: "900",
                          fontSize: "8.8px",
                        }}
                      >
                        MAX.
                        <br />
                        MARKS
                      </th>
                      <th
                        colSpan="3"
                        style={{
                          width: "27%",
                          border: "1px solid #000",
                          fontWeight: "900",
                          fontSize: "9px",
                          padding: "2px 0",
                        }}
                      >
                        OBTAINED MARKS
                      </th>
                      <th
                        rowSpan="2"
                        style={{
                          width: "17%",
                          border: "1px solid #000",
                          fontWeight: "900",
                          fontSize: "8.8px",
                        }}
                      >
                        OBTAINED
                        <br />
                        MARKS IN WORD
                      </th>
                      <th
                        rowSpan="2"
                        style={{
                          width: "10%",
                          border: "1px solid #000",
                          fontWeight: "900",
                          fontSize: "8.8px",
                        }}
                      >
                        SUBJECT
                        <br />
                        WISE GRADE
                      </th>
                    </tr>
                    <tr style={{ height: "6mm" }}>
                      <th
                        style={{
                          width: "9%",
                          border: "1px solid #000",
                          fontWeight: "900",
                          fontSize: "8px",
                          padding: "2px 0",
                        }}
                      >
                        THEORY
                      </th>
                      <th
                        style={{
                          width: "9%",
                          border: "1px solid #000",
                          fontWeight: "900",
                          fontSize: "8px",
                          padding: "2px 0",
                        }}
                      >
                        PRACTICAL
                      </th>
                      <th
                        style={{
                          width: "9%",
                          border: "1px solid #000",
                          fontWeight: "900",
                          fontSize: "8px",
                          padding: "2px 0",
                        }}
                      >
                        TOTAL
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {marksData.map((subj, index) => {
                      const subjectName =
                        subj.subject?.name ||
                        subj.subjectName ||
                        subj.name ||
                        "";
                      const harms = subjectName !== "---" && subjectName !== "";
                      const totalVal = harms
                        ? subj.total !== "-"
                          ? subj.total
                          : (Number(subj.theory) || 0) +
                            (Number(subj.practical) || 0)
                        : "";
                      const maxMarksVal = harms
                        ? subj.maxMarks ||
                          getMaxMarks(subjectName, index, marksData.length)
                        : "";
                      const gradeVal = harms
                        ? getSubjectGrade(totalVal, maxMarksVal)
                        : "";
                      const wordsVal = harms ? numberToWords(totalVal) : "";

                      // Resolve full subject name and subtexts intelligently
                      const subjectDetails = getSubjectDetails(
                        subjectName,
                        index,
                      );
                      const displaySubjectName = harms
                        ? subjectDetails.name
                        : "";
                      const displaySubtext = harms
                        ? subjectDetails.subtext
                        : "";

                      return (
                        <tr key={index} style={{ height: rowHeight }}>
                          <td style={{ border: "1px solid #000" }}>
                            {harms ? index + 1 : ""}
                          </td>
                          <td
                            style={{
                              border: "1px solid #000",
                              textAlign: "center",
                              padding: "2px 4px",
                            }}
                          >
                            {harms ? (
                              <>
                                <div
                                  className="sname"
                                  style={{ fontSize: snameFontSize }}
                                >
                                  {displaySubjectName}
                                </div>
                                {displaySubtext && (
                                  <div
                                    className="ssub"
                                    style={{ fontSize: ssubFontSize }}
                                  >
                                    {displaySubtext}
                                  </div>
                                )}
                              </>
                            ) : (
                              ""
                            )}
                          </td>
                          <td style={{ border: "1px solid #000" }}>
                            {harms ? maxMarksVal : ""}
                          </td>
                          <td style={{ border: "1px solid #000" }}>
                            {harms ? formatMark(subj.theory) : ""}
                          </td>
                          <td style={{ border: "1px solid #000" }}>
                            {harms ? formatMark(subj.practical) : ""}
                          </td>
                          <td style={{ border: "1px solid #000" }}>
                            {harms ? formatMark(totalVal) : ""}
                          </td>
                          <td
                            style={{
                              border: "1px solid #000",
                              textTransform: "uppercase",
                            }}
                          >
                            {harms ? wordsVal : ""}
                          </td>
                          <td
                            style={{
                              border: "1px solid #000",
                              textTransform: "uppercase",
                            }}
                          >
                            {harms ? gradeVal : ""}
                          </td>
                        </tr>
                      );
                    })}

                    {/* Grand Total */}
                    <tr className="gtotal" style={{ height: rowHeight }}>
                      <td
                        colSpan="3"
                        style={{
                          textAlign: "left",
                          paddingLeft: "8px",
                          fontSize: "9px",
                          fontWeight: "900",
                          border: "1px solid #000",
                          whiteSpace: "nowrap",
                        }}
                      >
                        GRAND TOTAL OF MARKS OBTAINED OUT OF
                      </td>
                      <td
                        colSpan="3"
                        style={{
                          fontSize: "11px",
                          fontWeight: "900",
                          textAlign: "center",
                          border: "1px solid #000",
                        }}
                      >
                        {marksObtained} / {totalMarks}
                      </td>
                      <td
                        colSpan="2"
                        style={{
                          textAlign: "right",
                          paddingRight: "8px",
                          fontSize: "9.5px",
                          fontWeight: "900",
                          textTransform: "uppercase",
                          border: "1px solid #000",
                        }}
                      >
                        {fullNumberToWords(marksObtained)} ONLY
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Spacing spacer */}
              <div style={{ height: spacerHeight }}></div>

              {/* BOTTOM SUMMARY TABLE positioned immediately below the main marks table */}
              <div
                className="bot-wrap"
                style={{
                  position: "relative",
                  top: "auto",
                  left: "auto",
                  width: "143mm",
                  zIndex: 10,
                }}
              >
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ height: "9mm" }}>
                      <th
                        style={{
                          width: "22%",
                          border: "1px solid #000",
                          fontWeight: "900",
                          fontSize: "8px",
                        }}
                      >
                        MONTH &amp; YEAR
                        <br />
                        OF EXAM
                      </th>
                      <th
                        style={{
                          width: "18%",
                          border: "1px solid #000",
                          fontWeight: "900",
                          fontSize: "8px",
                        }}
                      >
                        SR.NO. OF
                        <br />
                        STATEMENT
                      </th>
                      <th
                        style={{
                          width: "28%",
                          border: "1px solid #000",
                          fontWeight: "900",
                          fontSize: "8px",
                        }}
                      >
                        TOTAL PRESENTS (%)
                      </th>
                      <th
                        style={{
                          width: "16%",
                          border: "1px solid #000",
                          fontWeight: "900",
                          fontSize: "8px",
                        }}
                      >
                        PERCENTAGE (%)
                      </th>
                      <th
                        style={{
                          width: "16%",
                          border: "1px solid #000",
                          fontWeight: "900",
                          fontSize: "8px",
                        }}
                      >
                        GRADE
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ height: botTableHeight }}>
                      <td
                        style={{
                          border: "1px solid #000",
                          fontWeight: "900",
                          fontSize: botTableFontSize,
                        }}
                      >
                        {exam?.examName || "JANUARY - 2019"}
                      </td>
                      <td
                        className="td-blue"
                        style={{
                          border: "1px solid #000",
                          fontWeight: "900",
                          fontSize: botTableFontSize,
                          color: "#1565C0",
                        }}
                      >
                        {formatSomNumber(result.somNumber)}
                      </td>
                      <td
                        style={{
                          border: "1px solid #000",
                          fontWeight: "900",
                          fontSize: botTableFontSize,
                        }}
                      >
                        {totalPresentsText}
                      </td>
                      <td
                        style={{
                          border: "1px solid #000",
                          fontWeight: "900",
                          fontSize: botTableFontSize,
                        }}
                      >
                        {marksPercentage}
                      </td>
                      <td
                        style={{
                          border: "1px solid #000",
                          fontWeight: "900",
                          fontSize: `${parseFloat(botTableFontSize) + 1}px`,
                        }}
                      >
                        {displayResultGrade}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Date of issue and CSR number positioned dynamically in the fluid blank area with zero overlap */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-start",
                  alignItems: "center",
                  marginTop: dateIssueMarginTop,
                  width: "100%",
                  fontFamily: "Arial, sans-serif",
                  color: "#000",
                }}
              >
                <div style={{ fontSize: "3.6mm", fontWeight: "900" }}>
                  Date of issue :{" "}
                  {issueDate.isValid()
                    ? issueDate.format("DD MMMM YYYY")
                    : "15 May 2019"}
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Background pre-printed template image */}
            <img
              src={certificateImg}
              alt="Certificate Template Background"
              className="bg-img"
            />

            {/* QR Code positioned on the left side of "Certificate" word (which is in background) */}
            <div
              style={{
                position: "absolute",
                top: "80mm",
                left: "24mm",
                zIndex: 30,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  backgroundColor: "#fff",
                  padding: "1.2mm",
                  border: "1.2px solid #8e6c1a", // Gold border matching photo frame
                  borderRadius: "1mm",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <QRCodeSVG
                  value={`${window.location.origin}/print/exam-result/${id}?type=Certificate`}
                  size={70} // Optimized size for scanning and aesthetics
                  level="H"
                  includeMargin={false}
                />
              </div>
              <span
                style={{
                  fontSize: "1.8mm",
                  fontWeight: "900",
                  color: "#000", // Changed to black for better contrast outside border
                  marginTop: "1.2mm",
                  fontFamily: "Arial, sans-serif",
                  textTransform: "uppercase",
                  letterSpacing: "0.2px",
                }}
              >
                Scan to Verify
              </span>
            </div>

            {/* Photo Box positioned absolutely on top-right */}
            <div
              style={{
                position: "absolute",
                top: "40.5mm",
                right: "18.5mm",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                zIndex: 20,
              }}
            >
              <div
                style={{
                  width: "27.5mm",
                  height: "33.5mm",
                  border: "2px solid #8e6c1a", // Gold border matching template
                  padding: "0.8mm",
                  backgroundColor: "#fff",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                }}
              >
                {student?.studentPhoto ? (
                  <img
                    src={
                      student.studentPhoto.startsWith("http")
                        ? student.studentPhoto
                        : `${import.meta.env.VITE_IMAGE_URL}/${student.studentPhoto}`
                    }
                    alt="Student"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      objectPosition: "top",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      backgroundColor: "#f3f4f6",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "8px",
                      color: "#9ca3af",
                      fontWeight: "bold",
                    }}
                  >
                    PHOTO
                  </div>
                )}
              </div>
              <p
                style={{
                  marginTop: "1.5mm",
                  fontWeight: "900",
                  fontSize: "3.4mm",
                  fontFamily: "Arial, sans-serif",
                  color: "#000",
                  textTransform: "uppercase",
                  letterSpacing: "0.2px",
                }}
              >
                Reg. No. {student?.regNo || "0398/SUR"}
              </p>
            </div>

            {/* Content Container Flow positioned inside the certificate background */}
            <div
              style={{
                position: "absolute",
                top: "100mm",
                left: "17.5mm",
                width: "175mm",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                zIndex: 10,
                boxSizing: "border-box",
                textAlign: "center",
                color: "#000",
              }}
            >
              {/* This credential is awarded to */}
              <p
                className="cert-cursive"
                style={{
                  fontSize: "6.5mm",
                  margin: "4mm 0 2mm 0",
                  color: "#222",
                }}
              >
                This credential is awarded to
              </p>

              {/* Student Name */}
              <p
                className="cert-name"
                style={{
                  fontWeight: "700",
                  fontSize: "8.4mm",
                  margin: "0 0 2mm 0",
                  color: "#111",
                  letterSpacing: "0.3px",
                }}
              >
                {studentPrefix} {getStudentFullName()}
              </p>

              {/* D/o or S/o parent text */}
              <p
                className="cert-serif-text"
                style={{
                  fontSize: "5.0mm",
                  lineHeight: "1.5",
                  margin: "0 0 3mm 0",
                  color: "#111",
                }}
              >
                {student?.gender?.toLowerCase() === "female" ? "D/o" : "S/o"}{" "}
                Shri {getParentFullName()} On the{" "}
                {issueDate.isValid() ? issueDate.date() : "15"} day of the month{" "}
                {issueDate.isValid() ? issueDate.format("MMMM") : "November"}{" "}
                <br />
                In the year{" "}
                {issueDate.isValid()
                  ? yearToWords(issueDate.year())
                  : "Two Thousand Eighteen"}{" "}
                for successfully completed a <br />
                <span style={{ fontWeight: "bold" }}>
                  {course?.duration || "12"} {course?.durationType || "Months"}
                </span>{" "}
                course in
              </p>

              {/* Course name */}
              <p
                className="cert-course-title"
                style={{
                  fontWeight: "bold",
                  fontSize: "5.8mm",
                  textDecoration: "underline",
                  textTransform: "uppercase",
                  margin: "0 0 2.5mm 0",
                  color: "#000",
                  letterSpacing: "0.4px",
                  display: "inline-block",
                }}
              >
                {course?.name} 
              </p>

              {/* Grade and Center */}
              <p
                className="cert-serif-text"
                style={{
                  fontSize: "5.0mm",
                  margin: "0 0 4.5mm 0",
                  color: "#111",
                }}
              >
                With{" "}
                <span style={{ fontWeight: "bold" }}>
                  {displayResultGrade}
                </span>{" "}
                from our {getCenterName()}
              </p>

              {/* Course description given bellows these ares- */}
              <p
                className="cert-cursive"
                style={{
                  fontSize: "5.4mm",
                  margin: "0 0 3.5mm 0",
                  color: "#222",
                }}
              >
                Course description given bellows these ares-
              </p>

              {/* Two Column Subject List */}
              <div
                className="cert-subjects-grid"
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "2.0mm 8mm",
                  width: "100%",
                  maxWidth: "145mm",
                  textAlign: "left",
                  paddingLeft: "12mm",
                  fontSize: "4.4mm",
                  color: "#222",
                }}
              >
                {marksData.length > 0 ? (
                  marksData.map((subj, i) => {
                    const subjectName =
                      subj.subject?.name || subj.subjectName || subj.name || "";
                    const details = getSubjectDetails(subjectName, i);
                    return (
                      <div
                        key={i}
                        style={{
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {i + 1}- {details.name}
                      </div>
                    );
                  })
                ) : (
                  <>
                    <div>1- Basic</div>
                    <div>2- Desktop Publishing &amp; (Modeling)</div>
                    <div>3- Financial Accounting</div>
                    <div>4- Programming in C, C++</div>
                    <div>5- Internet &amp; Seminar</div>
                  </>
                )}
              </div>
            </div>

            {/* Absolute positioned Certificate Details block on bottom left */}
            <div
              style={{
                position: "absolute",
                bottom: "58mm",
                left: "22mm",
                display: "flex",
                flexDirection: "column",
                gap: "1.2mm",
                zIndex: 20,
                fontFamily: "Arial, sans-serif",
                fontWeight: "900",
                fontSize: "3.4mm",
                color: "#000",
                textAlign: "left",
              }}
            >
              <p>
                Certificate No :{" "}
                {formatCertificateNumber(result.somNumber)}
              </p>
              <p>
                Date of issue :{" "}
                {issueDate.isValid()
                  ? issueDate.format("DD MMMM YYYY")
                  : "15 May 2019"}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Custom Print Style overrides to strip page margins & load Montserrat/Playfair fonts */}
      <style type="text/css">
        {`
                    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400;1,700&family=Great+Vibes&display=swap');

                    .cert-cursive {
                        font-family: 'Great Vibes', cursive, 'Playfair Display', Georgia, serif;
                        font-weight: normal;
                        color: #111;
                    }

                    .cert-name {
                        font-family: 'Playfair Display', 'Times New Roman', Georgia, serif;
                        font-style: italic;
                    }

                    .cert-serif-text {
                        font-family: 'Playfair Display', 'Times New Roman', Georgia, serif;
                        font-style: italic;
                    }

                    .cert-course-title {
                        font-family: 'Playfair Display', 'Times New Roman', Georgia, serif;
                    }

                    .cert-subjects-grid {
                        font-family: 'Playfair Display', 'Times New Roman', Georgia, serif;
                        font-style: italic;
                    }

                    .sheet {
                        width: 210mm;
                        height: 297mm;
                        background: #fff;
                        position: relative;
                        overflow: hidden;
                        box-shadow: 0 8px 40px rgba(0,0,0,.4);
                    }
                    .bg-img {
                        position: absolute;
                        inset: 0;
                        width: 100%;
                        height: 100%;
                        object-fit: fill;
                        z-index: 0;
                    }
                    .ov {
                        position: absolute;
                        z-index: 10;
                        font-family: Arial, sans-serif;
                        font-weight: 900;
                        color: #000;
                        line-height: 1.2;
                    }
                    .tbl-wrap {
                        z-index: 10;
                        width: 175.5mm;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        font-family: Arial, sans-serif;
                        font-size: 9.5px;
                        font-weight: 700;
                        text-align: center;
                        background: transparent;
                    }
                    table th, table td {
                        border: 1px solid #000;
                        padding: 2px 2px;
                        background: transparent;
                    }
                    table thead th {
                        font-size: 8.8px;
                        font-weight: 900;
                        color: #111;
                    }
                    .th-obtained {
                        border-bottom: 1px solid #000;
                        padding: 2px 0;
                        font-size: 9px;
                        font-weight: 900;
                    }
                    .sub-cols {
                        display: flex;
                        border-top: 1px solid #000;
                    }
                    .sub-col {
                        flex: 1;
                        padding: 2px 0;
                        font-size: 8px;
                        font-weight: 900;
                        border-right: 1px solid #000;
                    }
                    .sub-col:last-child { border-right: none; }
                    .sname { font-size: 10px; font-weight: 900; text-transform: uppercase; line-height: 1.3; }
                    .ssub { font-size: 7px; font-weight: 600; color: #555; font-style: italic; margin-top: 1px; }
                    .gtotal td {
                        font-weight: 900!important;
                        font-size: 10px!important;
                        border-top: 1.5px solid #000;
                    }
                    .bot-wrap {
                        z-index: 10;
                        width: 143mm;
                    }
                    .bot-wrap table th { font-size: 8px; font-weight: 900; color: #111; }
                    .bot-wrap table td { font-size: 9px; font-weight: 900; }
                    .td-blue { color: #1565C0!important; }
                    .ov-date { top: 238.2mm; left: 42mm; font-size: 3.3mm; }
                    .ov-reg { top: 70.8mm; right: 18mm; font-size: 3.8mm; }
                    .ov-cname { top: 70.8mm; left: 60mm; font-size: 3.6mm; }
                    .ov-fname { top: 76.3mm; left: 60mm; font-size: 3.6mm; }
                    .ov-course { top: 81.8mm; left: 60mm; font-size: 3.6mm; max-width: 130mm; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                    .ov-dur { top: 87.3mm; left: 60mm; font-size: 3.6mm; }
                    .ov-centre { top: 92.8mm; left: 60mm; font-size: 3.6mm; }
                    .ov-csr { top: 246.2mm; right: 18mm; font-size: 3.3mm; color: #135CB3; }

                    @media print {
                        @page { 
                            size: A4 portrait; 
                            margin: 0; 
                        }
                        body {
                            background: #fff;
                            padding: 0;
                            -webkit-print-color-adjust: exact !important; 
                            print-color-adjust: exact !important;
                        }
                        .sheet {
                            box-shadow: none;
                            width: 210mm !important;
                            height: 297mm !important;
                            margin: 0 !important;
                            padding: 0 !important;
                        }
                    }
                `}
      </style>
    </div>
  );
};

export default ExamResultPrint;
