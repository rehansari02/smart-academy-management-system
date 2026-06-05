import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import {
  registerStudent,
  fetchStudents,
  resetStatus,
  fetchStudentById,
  updateStudent,
} from "../../../features/student/studentSlice";
import { formatInputText } from "../../../utils/textFormatter"; // Added util import
import {
  fetchCourses,
  fetchBatches,
  fetchReferences,
  fetchEducations,
  createReference,
  createEducation,
  fetchStates,
  fetchCities
} from "../../../features/master/masterSlice";
import { fetchInquiries } from "../../../features/transaction/transactionSlice";
import { fetchEmployees } from "../../../features/employee/employeeSlice";
import { getBranches } from "../../../features/master/branchSlice"; // Import API
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import axios from "axios"; // Added axios
import {
  Upload,
  ChevronRight,
  ChevronLeft,
  Save,
  Search,
  Plus,
  X,
  UserCheck,
  CreditCard,
  CheckCircle,
  Trash2,
  Edit2,
  Phone,
  Book,
  ArrowRight,
  User,
  Eye,
  Lock,
} from "lucide-react";
import ProfileImageUploader from "../../../components/common/ProfileImageUploader";
import InquiryViewModal from "../../../components/transaction/InquiryViewModal";
import { getTodayDateISO } from "../../../utils/dateUtils";

import { FormSkeleton } from "../../../components/common/SkeletonLoader"; // Corrected Import Location

// getUniqueEducation removed - using centralized master list instead
const POPULAR_INDIAN_BANKS = [
  "State Bank of India",
  "HDFC Bank",
  "ICICI Bank",
  "Axis Bank",
  "Punjab National Bank",
  "Bank of Baroda",
  "Canara Bank",
  "Union Bank of India",
  "Kotak Mahindra Bank",
  "IndusInd Bank",
  "IDFC First Bank",
  "Yes Bank",
  "Other",
];

const ONLINE_PAYMENT_TYPES = ["UPI", "Net Banking", "Bank Transfer", "Other"];
const UPI_PROVIDERS = ["Google Pay", "PhonePe", "Paytm", "BHIM", "Amazon Pay", "Other"];

const StudentAdmission = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Check if we're in update mode
  const updateId = searchParams.get('updateId');
  const isUpdateMode = Boolean(updateId);

  const { isSuccess, students, isLoading, message, currentStudent } = useSelector(
    (state) => state.students
  );
  const { inquiries } = useSelector((state) => state.transaction);
  const { courses, batches, references, educations, states, cities } = useSelector((state) => state.master);
  const { employees } = useSelector((state) => state.employees) || {
    employees: [],
  };
  const { branches } = useSelector((state) => state.branch);
  const { user } = useSelector((state) => state.auth); // Get Auth User

  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [isImageProcessing, setIsImageProcessing] = useState(false);
  const [previewCourses, setPreviewCourses] = useState([]);
  const [foundInquiry, setFoundInquiry] = useState(null);
  const [duplicateStudent, setDuplicateStudent] = useState(null);
  const [payAdmissionFee, setPayAdmissionFee] = useState(null); 
  const [isNewReference, setIsNewReference] = useState(false);
  const [inquiryIdFromAdmission, setInquiryIdFromAdmission] = useState(null); 
  const [lockedReferenceValue, setLockedReferenceValue] = useState("");
  const [matches, setMatches] = useState([]);
  const [viewDetailsMatch, setViewDetailsMatch] = useState(null);
  const [viewInquiryMatch, setViewInquiryMatch] = useState(null);

  // Modal & New Entry States
  const [showRefModal, setShowRefModal] = useState(false);
  const [showEduModal, setShowEduModal] = useState(false);
  const [newRef, setNewRef] = useState({ name: '', mobile: '', address: '' });
  const [newEdu, setNewEdu] = useState('');
  const [isRefLoading, setIsRefLoading] = useState(false);
  const [isEduLoading, setIsEduLoading] = useState(false);
  const [filteredCities, setFilteredCities] = useState([]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    trigger,
    getValues,
    formState: { errors },
  } = useForm({
    defaultValues: {
      admissionDate: getTodayDateISO(),
      state: "",
      city: "",
      relationType: "Father", 
      reference: "Direct",
      receiptPaymentMode: "Cash",
      receiptDate: getTodayDateISO(),
      receiptBankOption: "",
      onlinePaymentType: "UPI",
      onlineProviderOption: "",
      chequeDate: getTodayDateISO(), // Default today for UI
      transactionDate: getTodayDateISO(), // Default today for UI
    },
  });

  const watchFirstName = watch("firstName");
  const watchLastName = watch("lastName");
  const watchCourseSelection = watch("selectedCourseId");
  const watchSelectedBatch = watch("selectedBatch");
  const watchReference = watch("reference");
  const watchState = watch("state");
  const watchRelation = watch("relationType");
  const watchBranchId = watch("branchId"); // Watch Branch Selection
  const receiptPaymentMode = watch("receiptPaymentMode");
  const receiptBankOption = watch("receiptBankOption");
  const onlinePaymentType = watch("onlinePaymentType");
  const onlineProviderOption = watch("onlineProviderOption");
  const isReferenceLocked = Boolean((lockedReferenceValue || "").trim()) && user?.role !== "Super Admin";
  const referenceLockTitle = isReferenceLocked
    ? "Reference is locked because it was fetched from existing inquiry/visitor data. Only Super Admin can change it."
    : "";

  useEffect(() => {
    dispatch(fetchCourses()); // One call only
    // Only fetch batches initially if NOT Super Admin (Super Admin waits for selection)
    if (user?.role !== 'Super Admin') {
      dispatch(fetchBatches());
    }
    dispatch(fetchInquiries({}));
    dispatch(fetchStudents());
    dispatch(fetchEmployees());
    dispatch(fetchReferences());
    dispatch(fetchEducations());
    dispatch(fetchStates());
    dispatch(fetchCities());
    if(user?.role === 'Super Admin' && branches.length === 0) {
        dispatch(getBranches());
    }
  }, [dispatch, user, branches.length]);

  // Fetch batches when Branch changes (For Super Admin)
  useEffect(() => {
    if (user?.role === 'Super Admin' && watchBranchId) {
        dispatch(fetchBatches({ branchId: watchBranchId }));
        setValue("selectedBatch", ""); // Reset batch selection on branch change
    }
  }, [dispatch, user, watchBranchId, setValue]);

  // Handle inquiry data from location state (when navigating from Complete status)
  useEffect(() => {
    if (location.state?.inquiryData) {
      const inquiry = location.state.inquiryData;
      
      // Pre-fill all form fields from inquiry data
      setValue("firstName", inquiry.firstName || "");
      setValue("lastName", inquiry.lastName || "");
      setValue("middleName", inquiry.middleName || "");
      setValue("relationType", inquiry.relationType || "Father");
      setValue("email", inquiry.email || "");
      setValue("gender", inquiry.gender || "Male");
      setValue("mobileParent", inquiry.contactParent || "");
      setValue("mobileStudent", inquiry.contactStudent || "");
      setValue("contactHome", inquiry.contactHome || "");
      setValue("address", inquiry.address || "");
      setValue("state", inquiry.state || "Gujarat");
      setValue("city", inquiry.city || "Surat");
      setValue("occupationType", inquiry.occupationType || "Student");
      setValue("occupationName", inquiry.occupationName || "");
      setValue("motherName", inquiry.motherName || "");
      setValue("pincode", inquiry.pincode || "");
      setValue("education", inquiry.education || "");
      setValue("dob", inquiry.dob ? new Date(inquiry.dob).toISOString().split('T')[0] : "");
      const fetchedReference = inquiry.referenceBy || "Direct";
      setValue("reference", fetchedReference);
      setLockedReferenceValue(fetchedReference);
      
      if (inquiry.studentPhoto) {
        setPreviewImage(inquiry.studentPhoto);
        setValue("studentPhoto", inquiry.studentPhoto);
      }

      if (inquiry.branchId) {
          setValue("branchId", inquiry.branchId._id || inquiry.branchId);
      }

      // Auto-select Course from Inquiry
      if (inquiry.interestedCourse) {
          setValue("selectedCourseId", inquiry.interestedCourse._id || inquiry.interestedCourse);
      }

      if (inquiry._id) setInquiryIdFromAdmission(inquiry._id);
      toast.success("Student data pre-filled from inquiry!");
      
      // Clear the location state to prevent re-filling on re-render
      window.history.replaceState({}, document.title);
    } else if (location.state?.visitorData) {
      const profile = location.state.visitorData;
      
      const nameParts = (profile.studentName || "").trim().split(/\s+/);
      let first = "";
      let middle = "";
      let last = "";
      
      if (nameParts.length === 1) {
        first = nameParts[0];
      } else if (nameParts.length === 2) {
        first = nameParts[0];
        last = nameParts[1];
      } else if (nameParts.length > 2) {
        first = nameParts[0];
        last = nameParts[nameParts.length - 1];
        middle = nameParts.slice(1, nameParts.length - 1).join(" ");
      }
      
      setValue("firstName", first, { shouldValidate: true });
      setValue("lastName", last, { shouldValidate: true });
      setValue("middleName", middle, { shouldValidate: true });
      setValue("mobileStudent", profile.mobileNumber || "", { shouldValidate: true });
      setValue("mobileParent", profile.contactParent || "", { shouldValidate: true });
      setValue("contactHome", profile.contactHome || "", { shouldValidate: true });
      const fetchedReference = profile.reference || "Direct";
      setValue("reference", fetchedReference, { shouldValidate: true });
      setLockedReferenceValue(fetchedReference);
      setValue("remarks", profile.remarks || "", { shouldValidate: true });
      setValue("relationType", "Father", { shouldValidate: true });
      setValue("occupationType", "Student", { shouldValidate: true });
      
      if (profile.branchId) {
        setValue("branchId", profile.branchId._id || profile.branchId, { shouldValidate: true });
      }
      
      if (profile.course) {
        setValue("selectedCourseId", profile.course._id || profile.course, { shouldValidate: true });
      }
      
      if (profile.inquiryId) {
        setInquiryIdFromAdmission(profile.inquiryId._id || profile.inquiryId);
      } else {
        setInquiryIdFromAdmission(null);
      }
      
      toast.success("Student data pre-filled from visitor profile!");
      window.history.replaceState({}, document.title);
    }
  }, [location, setValue]);

  // Fetch student data when in update mode
  useEffect(() => {
    if (isUpdateMode && updateId) {
      dispatch(fetchStudentById(updateId));
    }
  }, [isUpdateMode, updateId, dispatch]);
  
  // Pre-fill form when student data is loaded in update mode
  useEffect(() => {
    if (isUpdateMode && currentStudent) {
      // Personal Details
      setValue("admissionDate", currentStudent.admissionDate?.split("T")[0]);
      setValue("aadharCard", currentStudent.aadharCard);
      setValue("firstName", currentStudent.firstName);
      setValue("middleName", currentStudent.middleName);
      setValue("lastName", currentStudent.lastName);
      setValue("relationType", currentStudent.relationType || "Father");
      setValue("occupationType", currentStudent.occupationType);
      setValue("occupationName", currentStudent.occupationName);
      setValue("motherName", currentStudent.motherName);
      setValue("email", currentStudent.email);
      setValue("dob", currentStudent.dob?.split("T")[0]);
      setValue("gender", currentStudent.gender);
      setValue("contactHome", currentStudent.contactHome);
      setValue("mobileStudent", currentStudent.mobileStudent);
      setValue("mobileParent", currentStudent.mobileParent);
      setValue("education", currentStudent.education);
      setValue("address", currentStudent.address);
      setValue("state", currentStudent.state);
      setValue("city", currentStudent.city);
      setValue("pincode", currentStudent.pincode);
      setValue("reference", currentStudent.reference);
      setLockedReferenceValue(currentStudent.reference || "");
      setValue("branchId", currentStudent.branchId);

      // Document Verification Fields
      setValue("isPhotos", currentStudent.isPhotos || false);
      setValue("isIDProof", currentStudent.isIDProof || false);
      setValue("isMarksheetCertificate", currentStudent.isMarksheetCertificate || false);
      setValue("isAddressProof", currentStudent.isAddressProof || false);
      setValue("isActive", currentStudent.isActive);

      // Course Details
      setValue("selectedCourseId", currentStudent.course?._id || currentStudent.course);
      setValue("selectedBatch", currentStudent.batch);
      setValue("paymentType", currentStudent.paymentPlan || "One Time");

      // Photo
      if (currentStudent.studentPhoto) {
        const photoUrl = currentStudent.studentPhoto.startsWith("http")
          ? currentStudent.studentPhoto
          : `${import.meta.env.VITE_API_URL}/${currentStudent.studentPhoto}`;
        setPreviewImage(photoUrl);
      }

      // Set preview courses for display
      if (currentStudent.course) {
        const courseObj = courses.find(c => c._id === (currentStudent.course._id || currentStudent.course));
        if (courseObj) {
          const batchObj = batches.find(b => b.name === currentStudent.batch);
          setPreviewCourses([{
            id: Date.now(),
            courseId: courseObj._id,
            courseName: courseObj.name,
            batch: currentStudent.batch,
            batchTime: batchObj ? `${batchObj.startTime} - ${batchObj.endTime}` : "N/A",
            startDate: currentStudent.batchStartDate ? currentStudent.batchStartDate.split("T")[0] : currentStudent.admissionDate?.split("T")[0],
            fees: currentStudent.totalFees,
            admissionFees: courseObj.admissionFees || 500,
            paymentType: currentStudent.paymentPlan || "One Time",
            emiConfig: currentStudent.emiDetails,
          }]);
        }
      }
    }
  }, [isUpdateMode, currentStudent, setValue, courses, batches, states, cities]);

  // Filter cities when state changes
  useEffect(() => {
    if (watchState && states.length > 0 && cities.length > 0) {
      const stateObj = states.find(s => s.name === watchState);
      if (stateObj) {
        const citiesForState = cities.filter(c => 
          c.stateId?._id === stateObj._id || c.stateId === stateObj._id
        );
        setFilteredCities(citiesForState);
      }
    }
  }, [watchState, states, cities]);

// educationOptions effect removed

  useEffect(() => {
    if (isSuccess) {
      toast.success(
        isUpdateMode
          ? "Student details updated successfully!"
          : payAdmissionFee
          ? "Student Admitted & Fees Paid!"
          : "Admission Draft Created!"
      );
      dispatch(resetStatus());
      const returnUrl = searchParams.get('returnUrl');
      navigate(
        isUpdateMode
          ? (returnUrl || "/master/student")
          : payAdmissionFee
          ? "/transaction/pending-registration"
          : "/transaction/pending-admission-fees"
      );
    }
    if (message && !isSuccess && !isLoading) {
      toast.error(message);
      dispatch(resetStatus());
    }

    if (!isLoading) {
      setIsSubmitting(false);
    }
  }, [isSuccess, message, isLoading, dispatch, navigate, payAdmissionFee, isUpdateMode]);

  const watchMobileStudent = watch("mobileStudent");
  const watchMobileParent = watch("mobileParent");

  useEffect(() => {
    const fetchMatches = async () => {
      if (isUpdateMode || inquiryIdFromAdmission) {
        setMatches([]);
        return;
      }

      const name = `${watchFirstName || ''} ${watchLastName || ''}`.trim();
      const mobileS = (watchMobileStudent || '').trim();
      const mobileP = (watchMobileParent || '').trim();
      
      // Search if name is >= 3 chars OR any mobile is >= 5 chars
      const searchTerm = (name.length >= 3) ? name : (mobileS.length >= 5 ? mobileS : (mobileP.length >= 5 ? mobileP : ''));
      
      if (!searchTerm) {
        setMatches([]);
        return;
      }

      try {
        const [inquiriesRes, visitorsRes] = await Promise.all([
          axios.get(`${import.meta.env.VITE_API_URL}/transaction/inquiry`, {
            params: { search: searchTerm, scope: 'admission' },
            withCredentials: true
          }),
          axios.get(`${import.meta.env.VITE_API_URL}/visitors/all`, {
            params: { search: searchTerm, scope: 'admission' },
            withCredentials: true
          })
        ]);

        const admittedStudents = students || [];

        const isAlreadyAdmitted = (pName, pMobileS, pMobileP, pMobileH) => {
          const cleanPName = (pName || '').toLowerCase().replace(/\s+/g, '');
          if (!cleanPName) return false;
          
          return admittedStudents.some(s => {
            const cleanSName = `${s.firstName || ''}${s.lastName || ''}`.toLowerCase().replace(/\s+/g, '');
            
            // For a more lenient search, we can check if they share a significant part of the name
            // But to avoid blocking siblings, exact match or partial match on name is safer.
            const nameMatch = cleanSName === cleanPName || cleanPName.includes(cleanSName) || cleanSName.includes(cleanPName);
            
            const mobileSMatch = pMobileS && (
              pMobileS === s.mobileStudent || 
              pMobileS === s.mobileParent || 
              pMobileS === s.contactHome
            );
            const mobilePMatch = pMobileP && (
              pMobileP === s.mobileStudent || 
              pMobileP === s.mobileParent || 
              pMobileP === s.contactHome
            );
            const mobileHMatch = pMobileH && (
              pMobileH === s.mobileStudent || 
              pMobileH === s.mobileParent || 
              pMobileH === s.contactHome
            );
            
            const hasMobileMatch = mobileSMatch || mobilePMatch || mobileHMatch;
            const hasProfileMobile = !!(pMobileS || pMobileP || pMobileH);
            
            // If they have a mobile, they MUST match both name (or part of it) AND mobile to be considered identical.
            // This prevents siblings (same mobile, different name) from being blocked.
            if (hasProfileMobile) {
                return nameMatch && hasMobileMatch;
            }
            // If no mobile, rely on name match
            return nameMatch;
          });
        };

        const filteredInquiries = (inquiriesRes.data || []).filter(inq => {
          const fullName = `${inq.firstName || ''} ${inq.lastName || ''}`.trim();
          return !isAlreadyAdmitted(fullName, inq.contactStudent, inq.contactParent, inq.contactHome);
        });

        const filteredVisitors = (visitorsRes.data || []).filter(vis => {
          return !isAlreadyAdmitted(vis.studentName, vis.mobileNumber, vis.contactParent, vis.contactHome);
        });

        const mergedSuggestions = [];

        filteredInquiries.forEach(inq => {
          mergedSuggestions.push({
            ...inq,
            type: 'Inquiry'
          });
        });

        filteredVisitors.forEach(vis => {
          const isDuplicate = mergedSuggestions.some(item => {
            const isSameInquiryId = vis.inquiryId && (
              (typeof vis.inquiryId === 'object' && vis.inquiryId?._id === item._id) || 
              (typeof vis.inquiryId === 'string' && vis.inquiryId === item._id)
            );
            
            const cleanVisName = (vis.studentName || '').toLowerCase().replace(/\s+/g, '');
            const cleanItemName = `${item.firstName || ''}${item.lastName || ''}`.toLowerCase().replace(/\s+/g, '');
            const isSameNameAndPhone = cleanVisName === cleanItemName && (
              vis.mobileNumber === item.contactStudent || 
              vis.mobileNumber === item.contactParent
            );
            
            return isSameInquiryId || isSameNameAndPhone;
          });

          if (!isDuplicate) {
            mergedSuggestions.push({
              ...vis,
              type: 'Visitor'
            });
          }
        });

        setMatches(mergedSuggestions.slice(0, 10));
      } catch (err) {
        console.error("Match fetch failed", err);
      }
    };
    const timer = setTimeout(fetchMatches, 500);
    return () => clearTimeout(timer);
  }, [watchFirstName, watchLastName, watchMobileStudent, watchMobileParent, isUpdateMode, inquiryIdFromAdmission]);

  useEffect(() => {
    if (watchFirstName && watchLastName) {
      const student = students.find(
        (s) =>
          s.firstName?.toLowerCase() === watchFirstName.toLowerCase() &&
          s.lastName?.toLowerCase() === watchLastName.toLowerCase()
      );
      setDuplicateStudent(student || null);
    }
  }, [watchFirstName, watchLastName, students]);

  // Fetch Next Receipt Number when entering Step 3 (Payment)
  const [nextReceiptNo, setNextReceiptNo] = useState("Loading...");

  useEffect(() => {
      if (step === 3 && payAdmissionFee === true) {
          const fetchReceiptNo = async () => {
              try {
                  const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/transaction/fees/next-no`, {
                      withCredentials: true
                  });
                  setNextReceiptNo(data);
              } catch (error) {
                  console.error("Failed to fetch next receipt no", error);
                  setNextReceiptNo("Error");
              }
          };
          fetchReceiptNo();
      }
  }, [step, payAdmissionFee]);

// isNewReference effect removed

  const handleFillFromProfile = (profile) => {
    if (!profile) return;

    // Determine the actual data source (prefer Inquiry data if it's a Visitor with linked Inquiry)
    const isVisitor = profile.type === 'Visitor';
    const hasInquiry = profile.inquiryId && typeof profile.inquiryId === 'object';
    const data = hasInquiry ? { ...profile.inquiryId, type: 'Inquiry' } : profile;

    console.log("Autofilling from:", data.type, data);

    if (data.type === 'Visitor') {
      const nameParts = (data.studentName || "").trim().split(/\s+/);
      let first = "";
      let middle = "";
      let last = "";
      
      if (nameParts.length === 1) {
        first = nameParts[0];
      } else if (nameParts.length === 2) {
        first = nameParts[0];
        last = nameParts[1];
      } else if (nameParts.length > 2) {
        first = nameParts[0];
        last = nameParts[nameParts.length - 1];
        middle = nameParts.slice(1, nameParts.length - 1).join(" ");
      }
      
      setValue("firstName", first, { shouldValidate: true });
      setValue("lastName", last, { shouldValidate: true });
      setValue("middleName", middle, { shouldValidate: true });
      setValue("mobileStudent", data.mobileNumber || "", { shouldValidate: true });
      setValue("mobileParent", data.contactParent || "", { shouldValidate: true });
      setValue("contactHome", data.contactHome || "", { shouldValidate: true });
      
      const fetchedReference = data.reference || "Direct";
      setValue("reference", fetchedReference, { shouldValidate: true });
      setLockedReferenceValue(fetchedReference);
      
      setValue("remarks", data.remarks || "", { shouldValidate: true });
      setValue("relationType", "Father", { shouldValidate: true });
      setValue("occupationType", "Student", { shouldValidate: true });
      setValue("gender", data.gender || "Male", { shouldValidate: true });
      setValue("address", data.address || "", { shouldValidate: true });
      
      if (data.branchId) {
        setValue("branchId", data.branchId._id || data.branchId, { shouldValidate: true });
      }
      
      if (data.course) {
        setValue("selectedCourseId", data.course._id || data.course, { shouldValidate: true });
      }
      
      if (data.inquiryId) {
        setInquiryIdFromAdmission(data.inquiryId._id || data.inquiryId);
      } else {
        setInquiryIdFromAdmission(null);
      }
      
      toast.info(`Data filled from Visitor profile: ${data.studentName}`);
    } else {
      // It's an Inquiry
      setValue("firstName", data.firstName || "", { shouldValidate: true });
      setValue("lastName", data.lastName || "", { shouldValidate: true });
      setValue("middleName", data.middleName || "", { shouldValidate: true });
      setValue("relationType", data.relationType || "Father", { shouldValidate: true });
      setValue("email", data.email || "", { shouldValidate: true });
      setValue("gender", data.gender || "Male", { shouldValidate: true });
      setValue("mobileParent", data.contactParent || "", { shouldValidate: true });
      setValue("mobileStudent", data.contactStudent || "", { shouldValidate: true });
      setValue("contactHome", data.contactHome || "", { shouldValidate: true });
      setValue("address", data.address || "", { shouldValidate: true });
      setValue("occupationType", data.occupationType || "Student", { shouldValidate: true });
      setValue("occupationName", data.occupationName || "", { shouldValidate: true });
      setValue("motherName", data.motherName || "", { shouldValidate: true });
      setValue("pincode", data.pincode || "", { shouldValidate: true });
      
      if (data.state) {
          setValue("state", data.state, { shouldValidate: true });
          const stateObj = states.find(s => s.name === data.state);
          if (stateObj) {
              const citiesForState = cities.filter(c => 
                c.stateId?._id === stateObj._id || c.stateId === stateObj._id
              );
              setFilteredCities(citiesForState);
              setTimeout(() => {
                  setValue("city", data.city || "", { shouldValidate: true });
              }, 100);
          } else {
              setValue("city", data.city || "", { shouldValidate: true });
          }
      }

      setValue("education", data.education || "", { shouldValidate: true });
      setValue("dob", data.dob ? new Date(data.dob).toISOString().split('T')[0] : "", { shouldValidate: true });
      
      const fetchedReference = data.referenceBy || "Direct";
      setValue("reference", fetchedReference, { shouldValidate: true });
      setLockedReferenceValue(fetchedReference);
      
      if (data.branchId) {
          setValue("branchId", data.branchId._id || data.branchId, { shouldValidate: true });
      }

      // Important: set course AFTER branch to avoid reset from branch watch effect
      if (data.interestedCourse) {
          setTimeout(() => {
            setValue("selectedCourseId", data.interestedCourse._id || data.interestedCourse, { shouldValidate: true });
          }, 200);
      }

      if (data.studentPhoto) {
          const photoUrl = data.studentPhoto.startsWith("http")
            ? data.studentPhoto
            : `${import.meta.env.VITE_API_URL}/${data.studentPhoto}`;
          setPreviewImage(photoUrl);
          setValue("studentPhoto", data.studentPhoto, { shouldValidate: true });
      }

      if (data._id) {
        setInquiryIdFromAdmission(data._id);
      }

      toast.info(`Data filled from Inquiry profile: ${data.firstName} ${data.lastName}`);
    }
    
    setMatches([]);
  };

  const handleAddCourseToList = () => {
    const courseId = getValues("selectedCourseId");
    const batchName = getValues("selectedBatch");
    const startDate = getValues("batchStartDate");
    const paymentType = getValues("paymentType");

    // Validation
    if (!courseId || !batchName) {
      toast.error("Please select Course and Batch");
      return;
    }
    
    // In create mode, require start date
    if (!isUpdateMode && !startDate) {
      toast.error("Please select Start Date");
      return;
    }

    const courseObj = courses.find((c) => c._id === courseId);
    const batchObj = batches.find((b) => b.name === batchName);

    let finalFees = courseObj.courseFees;
    let emiConfig = null;
    const admissionFee = courseObj.admissionFees || 500;
    const registrationFees = courseObj.registrationFees || 0;

    // Calculate EMI for both create and edit mode when Monthly is selected
    const effectivePaymentType = isUpdateMode ? paymentType : paymentType;
    if (effectivePaymentType === "Monthly") {
      const installments = courseObj.totalInstallment || 1;
      const remaining = finalFees - registrationFees;
      const monthlyAmt = Math.ceil(remaining / installments);

      emiConfig = {
        registrationFees: registrationFees,
        monthlyInstallment: monthlyAmt,
        months: installments,
        admissionFees: admissionFee,
      };
    }

    // Determine start date: in edit mode, use provided or default to original
    let effectiveStartDate;
    if (isUpdateMode) {
      effectiveStartDate = startDate || currentStudent?.batchStartDate?.split("T")[0] || currentStudent?.admissionDate?.split("T")[0];
    } else {
      effectiveStartDate = startDate;
    }

    const newEntry = {
      id: Date.now(),
      courseId: courseObj._id,
      courseName: courseObj.name,
      batch: batchName,
      batchTime: batchObj
        ? `${batchObj.startTime} - ${batchObj.endTime}`
        : "N/A",
      startDate: effectiveStartDate,
      fees: finalFees,
      admissionFees: admissionFee,
      registrationFees: registrationFees,
      paymentType: effectivePaymentType,
      emiConfig: emiConfig,
    };
    setPreviewCourses([newEntry]);
    if (!isUpdateMode) {
      setValue("selectedCourseId", "");
    }
  };

  const onSubmit = (data) => {
    if (previewCourses.length === 0) {
      toast.error("Please add a course first.");
      return;
    }

    if (isSubmitting) return; 
    setIsSubmitting(true);

    const primaryCourse = previewCourses[0];

    // Validation: Amount Check against Course Admission Fee
    if (payAdmissionFee === true && primaryCourse) {
       // Ensure numeric comparison
       const maxFee = Number(primaryCourse.admissionFees);
       const enteredAmount = Number(data.amountPaid);
       
       if (enteredAmount > maxFee) {
          toast.error(`Amount cannot exceed the Course Admission Fee (₹${maxFee})`);
          setIsSubmitting(false);
          return;
       }
    }

    // Ensure we only pay if the User explicitly selected "Yes" (payAdmissionFee === true)
    // Removed fallback to data.amountPaid to prevent bug where stale Step 3 data triggers payment after going back and selecting "No".
    const isPaying = payAdmissionFee === true;

    if (isPaying && data.receiptPaymentMode === "Cheque") {
      if (!data.bankName?.trim() || !data.chequeNumber?.trim() || !data.chequeDate) {
        toast.error("Please enter cheque bank, cheque number, and cheque date");
        setIsSubmitting(false);
        return;
      }
    }

    if (isPaying && data.receiptPaymentMode === "Online/UPI") {
      if (!data.transactionId?.trim() || !data.transactionDate) {
        toast.error("Please enter online payment bank/provider, transaction number, and transaction date");
        setIsSubmitting(false);
        return;
      }
      if (data.onlinePaymentType === "UPI" && !data.paymentProviderName?.trim()) {
        toast.error("Please select UPI app/provider");
        setIsSubmitting(false);
        return;
      }
      if (data.onlinePaymentType === "UPI" && !data.upiId?.trim()) {
        toast.error("Please enter UPI ID / number");
        setIsSubmitting(false);
        return;
      }
      if (data.onlinePaymentType !== "UPI" && !data.bankName?.trim()) {
        toast.error("Please enter online payment bank/provider");
        setIsSubmitting(false);
        return;
      }
      if (data.onlinePaymentType === "Other" && !data.paymentProviderName?.trim()) {
        toast.error("Please enter online payment name/provider");
        setIsSubmitting(false);
        return;
      }
    }
      
    const payload = {
      ...data,
      course: primaryCourse.courseId,
      batch: primaryCourse.batch,
      batchStartDate: primaryCourse.startDate, // Include start date
      totalFees: primaryCourse.fees,
      paymentPlan: primaryCourse.paymentType,
      emiDetails: primaryCourse.emiConfig, // Include EMI details
      reference: isReferenceLocked ? lockedReferenceValue : data.reference,
      // Legacy referenceDetails removed in favor of standardized Reference Master
      referenceDetails: null,
      // Include document verification fields
      isPhotos: data.isPhotos || false,
      isIDProof: data.isIDProof || false,
      isMarksheetCertificate: data.isMarksheetCertificate || false,
      isAddressProof: data.isAddressProof || false,
      isActive: data.isActive !== undefined ? data.isActive : true,
      ...(inquiryIdFromAdmission && !isUpdateMode && { inquiryId: inquiryIdFromAdmission }),
      feeDetails: isPaying
        ? {
            amount: Number(data.amountPaid),
            paymentMode: data.receiptPaymentMode,
            // FIXED: If remarks is empty, send 'Admission Fee'
            remarks: data.remarks || 'Admission Fee',
            date: data.receiptDate,
            // Dynamic Fields
            bankName: data.bankName,
            chequeNumber: data.chequeNumber,
            chequeDate: data.chequeDate,
            transactionId: data.transactionId,
            transactionDate: data.transactionDate,
            onlinePaymentType: data.onlinePaymentType,
            paymentProviderName: data.paymentProviderName,
            paymentDetails: data.onlinePaymentType === "UPI" ? data.upiId : data.paymentDetails,
          }
        : null,
    };

    // Convert to FormData if there's a photo file
    let submitData;
    if (data.studentPhoto && data.studentPhoto instanceof File) {
      const formData = new FormData();
      
      // Append all payload fields
      Object.keys(payload).forEach(key => {
        if (key === 'feeDetails' && payload[key]) {
          // Append nested feeDetails as JSON string
          formData.append('feeDetails', JSON.stringify(payload[key]));
        } else if (key === 'emiDetails' && payload[key]) {
          // Append EMI details as JSON string
          formData.append('emiDetails', JSON.stringify(payload[key]));
        } else if (key !== 'studentPhoto' && payload[key] != null) {
          formData.append(key, payload[key]);
        }
      });
      
      // Append the photo file
      formData.append('studentPhoto', data.studentPhoto);
      submitData = formData;
    } else {
      submitData = payload;
    }

    // Check if we're in update mode
    if (isUpdateMode && updateId) {
      dispatch(updateStudent({ id: updateId, data: submitData }));
    } else {
      dispatch(registerStudent(submitData));
    }
  };

  // Auto-update preview in edit mode when course/batch changes
  useEffect(() => {
    if (isUpdateMode && watchCourseSelection && watchSelectedBatch && step === 2) {
      handleAddCourseToList();
    }
  }, [isUpdateMode, watchCourseSelection, watchSelectedBatch, step]);

  // Auto-set payment for One Time plan removed - now optional for all
  useEffect(() => {
    if (previewCourses.length === 0) {
        setPayAdmissionFee(null); // Reset when list cleared
    }
  }, [previewCourses]);

  const renderStepHeader = () => (
    <div className="flex justify-center items-center mb-8">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className={`flex items-center ${
            step === i ? "text-blue-700 font-bold" : "text-gray-400"
          }`}
        >
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center border-2 mr-2 
                        ${
                          step >= i
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-white border-gray-300"
                        }`}
          >
            {step > i ? <CheckCircle size={16} /> : i}
          </div>
          {i !== 3 && (
            <div
              className={`w-12 h-1 bg-gray-300 mr-2 ${
                step > i ? "bg-blue-600" : ""
              }`}
            ></div>
          )}
        </div>
      ))}
    </div>
  );

  // Skeleton Loading Check
  if (isLoading && ((isUpdateMode && !currentStudent) || (!isUpdateMode && courses.length === 0))) {
      return (
          <div className="bg-gray-100 min-h-screen p-6 font-sans">
              <div className="max-w-6xl mx-auto bg-white shadow-xl rounded-xl overflow-hidden p-8">
                  <FormSkeleton rows={5} cols={3} />
              </div>
          </div>
      );
  }

  return (
    <div className="bg-gray-100 min-h-screen p-6 font-sans">
      <div className="max-w-6xl mx-auto bg-white shadow-xl rounded-xl overflow-hidden">
        <div className="bg-gradient-to-r from-blue-900 to-indigo-800 p-4 flex justify-between items-center text-white shadow-md">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <UserCheck size={24} /> {isUpdateMode ? "Update Student Details" : "New Student Admission"}
          </h1>
          <button
            type="button"
            onClick={() => navigate("/master/student")}
            className="hover:bg-white/20 p-2 rounded-full transition"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-8 relative">
          {/* Modals placed relative to form container */}
          {showRefModal && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/20 rounded-xl">
                <div className="bg-white p-5 rounded-lg shadow-2xl w-96 border animate-fadeIn">
                    <div className="flex justify-between items-center mb-4 border-b pb-2">
                        <h4 className="font-bold text-gray-800">Add New Reference</h4>
                        <button type="button" onClick={() => setShowRefModal(false)}><X size={18} className="text-gray-500 hover:text-red-500"/></button>
                    </div>
                    <div className="space-y-3">
                        <input 
                            className="w-full border p-2 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Full Name *"
                            value={newRef.name}
                            onChange={e => setNewRef({...newRef, name: formatInputText(e.target.value)})}
                        />
                        <input 
                            className="w-full border p-2 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Mobile Number *"
                            value={newRef.mobile}
                            onChange={e => setNewRef({...newRef, mobile: e.target.value})}
                        />
                        <input 
                            className="w-full border p-2 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="City / Address"
                            value={newRef.address}
                            onChange={e => setNewRef({...newRef, address: formatInputText(e.target.value)})}
                        />
                        <button 
                            type="button" 
                            onClick={() => {
                                if(!newRef.name || !newRef.mobile) return toast.error('Name & Mobile required');
                                setIsRefLoading(true);
                                dispatch(createReference(newRef)).then((res) => {
                                    setIsRefLoading(false);
                                    if(!res.error) {
                                        setValue('reference', newRef.name);
                                        setShowRefModal(false);
                                        toast.success('Reference Added!');
                                        setNewRef({ name: '', mobile: '', address: '' });
                                    }
                                });
                            }}
                            disabled={isRefLoading}
                            className="w-full py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700 transition flex justify-center items-center gap-2"
                        >
                            {isRefLoading ? 'Saving...' : 'Save Reference'}
                        </button>
                    </div>
                </div>
            </div>
          )}

          {showEduModal && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/20 rounded-xl">
                <div className="bg-white p-5 rounded-lg shadow-2xl w-80 border animate-fadeIn">
                     <div className="flex justify-between items-center mb-4 border-b pb-2">
                        <h4 className="font-bold text-gray-800">Add Education</h4>
                        <button type="button" onClick={() => setShowEduModal(false)}><X size={18} className="text-gray-500 hover:text-red-500"/></button>
                    </div>
                     <div className="space-y-3">
                        <input 
                            className="w-full border p-2 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Degree / Certificate Name *"
                            value={newEdu}
                            onChange={e => setNewEdu(formatInputText(e.target.value))}
                        />
                        <button 
                            type="button" 
                            onClick={() => {
                                if(!newEdu) return toast.error('Education Name required');
                                setIsEduLoading(true);
                                dispatch(createEducation({ name: newEdu })).then((res) => {
                                    setIsEduLoading(false);
                                     if(!res.error) {
                                        setValue('education', newEdu);
                                        setShowEduModal(false);
                                        toast.success('Education Added!');
                                        setNewEdu('');
                                     }
                                });
                            }}
                            disabled={isEduLoading}
                            className="w-full py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700 transition flex justify-center items-center gap-2"
                        >
                            {isEduLoading ? 'Saving...' : 'Save Education'}
                        </button>
                     </div>
                </div>
            </div>
          )}

          {viewInquiryMatch && (
            <InquiryViewModal 
              inquiry={viewInquiryMatch} 
              onClose={() => setViewInquiryMatch(null)} 
            />
          )}

          {viewDetailsMatch && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 overflow-y-auto">
              <div className="bg-white rounded-[2rem] shadow-2xl max-w-3xl w-full my-8 overflow-hidden animate-fade-in-up border border-orange-100">
                <div className="bg-gradient-to-r from-orange-600 to-red-600 text-white p-6 flex justify-between items-center sticky top-0 z-10 shadow-lg">
                  <div className="flex items-center gap-3">
                    <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
                      <User size={24} className="text-white" />
                    </div>
                    <div>
                      <h3 className="font-[900] text-xl tracking-tight uppercase">Student Visitor Profile</h3>
                      <p className="text-[10px] font-bold text-orange-100 tracking-[0.2em] opacity-80">WALK-IN VISITOR RECORD</p>
                    </div>
                  </div>
                  <button onClick={() => setViewDetailsMatch(null)} className="hover:bg-white/20 p-2 rounded-2xl transition-all hover:rotate-90">
                    <X size={24} />
                  </button>
                </div>
                
                <div className="p-0 max-h-[75vh] overflow-y-auto custom-scrollbar">
                  {/* Student Basic Info Section */}
                  <div className="p-8 bg-gradient-to-b from-orange-50/50 to-white">
                    
                    <div className="mb-8 flex items-center gap-2">
                       <div className="h-1.5 w-8 rounded-full bg-orange-500" />
                       <h4 className="text-xs font-[900] uppercase tracking-widest text-slate-400">Personal Identification</h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                      {/* Left Column */}
                      <div className="space-y-6">
                        <div className="group">
                          <p className="text-slate-400 uppercase text-[10px] font-[900] tracking-widest mb-1.5 group-hover:text-orange-500 transition-colors">Full Name</p>
                          <p className="font-[900] text-slate-800 text-xl tracking-tight leading-none">
                            {viewDetailsMatch.type === 'Visitor' ? viewDetailsMatch.studentName : `${viewDetailsMatch.firstName || ''} ${viewDetailsMatch.middleName || ''} ${viewDetailsMatch.lastName || ''}`}
                          </p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                           <div className="group">
                             <p className="text-slate-400 uppercase text-[10px] font-[900] tracking-widest mb-1.5 group-hover:text-orange-500 transition-colors">Mobile Number</p>
                             <p className="font-black text-slate-700 flex items-center gap-2">
                               <div className="bg-orange-100 p-1 rounded-md"><Phone size={12} className="text-orange-600"/></div>
                               {viewDetailsMatch.type === 'Visitor' ? (viewDetailsMatch.mobileNumber || 'N/A') : (viewDetailsMatch.contactStudent || 'N/A')}
                             </p>
                           </div>
                           <div className="group">
                             <p className="text-slate-400 uppercase text-[10px] font-[900] tracking-widest mb-1.5 group-hover:text-orange-500 transition-colors">Parent Contact</p>
                             <p className="font-black text-slate-700 flex items-center gap-2">
                               <div className="bg-orange-100 p-1 rounded-md"><Phone size={12} className="text-orange-600"/></div>
                               {viewDetailsMatch.contactParent || 'N/A'}
                             </p>
                           </div>
                        </div>

                        {viewDetailsMatch.type === 'Inquiry' && viewDetailsMatch.email && (
                            <div className="group">
                              <p className="text-slate-400 uppercase text-[10px] font-[900] tracking-widest mb-1.5 group-hover:text-orange-500 transition-colors">Email Address</p>
                              <p className="font-black text-slate-700">{viewDetailsMatch.email}</p>
                            </div>
                        )}

                        <div className="group">
                          <p className="text-slate-400 uppercase text-[10px] font-[900] tracking-widest mb-1.5 group-hover:text-orange-500 transition-colors">Address / Location</p>
                          <p className="text-sm font-bold text-slate-600 leading-relaxed italic">
                            {viewDetailsMatch.type === 'Visitor' ? (viewDetailsMatch.address || 'Address not recorded') : (viewDetailsMatch.address ? `${viewDetailsMatch.address}, ${viewDetailsMatch.city || ''}, ${viewDetailsMatch.state || ''}` : 'Address not recorded')}
                          </p>
                        </div>
                      </div>

                      {/* Right Column */}
                      <div className="space-y-6">
                        <div className="group">
                          <p className="text-slate-400 uppercase text-[10px] font-[900] tracking-widest mb-1.5 group-hover:text-orange-500 transition-colors">Interested Course</p>
                          <div className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-2xl shadow-lg shadow-blue-200">
                             <Book size={16} fill="currentColor" className="opacity-80" />
                             <p className="font-black text-sm uppercase tracking-tight">
                               {viewDetailsMatch.type === 'Visitor' ? (viewDetailsMatch.course?.name || viewDetailsMatch.course || 'N/A') : (viewDetailsMatch.interestedCourse?.name || 'N/A')}
                             </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                           <div className="group">
                             <p className="text-slate-400 uppercase text-[10px] font-[900] tracking-widest mb-1.5 group-hover:text-orange-500 transition-colors">Reference Source</p>
                             <span className="inline-block bg-slate-100 text-slate-700 px-3 py-1 rounded-xl text-[11px] font-black uppercase tracking-wider border border-slate-200">
                               {viewDetailsMatch.type === 'Visitor' ? (viewDetailsMatch.reference || 'Direct') : (viewDetailsMatch.referenceBy || 'Direct')}
                             </span>
                           </div>
                           <div className="group">
                             <p className="text-slate-400 uppercase text-[10px] font-[900] tracking-widest mb-1.5 group-hover:text-orange-500 transition-colors">Gender</p>
                             <p className="font-black text-slate-700 uppercase text-xs">{viewDetailsMatch.gender || 'N/A'}</p>
                           </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                           <div className="group">
                             <p className="text-slate-400 uppercase text-[10px] font-[900] tracking-widest mb-1.5 group-hover:text-orange-500 transition-colors">
                               {viewDetailsMatch.type === 'Visitor' ? 'Visiting Date' : 'Inquiry Date'}
                             </p>
                             <p className="font-black text-slate-700 text-sm">
                               {viewDetailsMatch.type === 'Visitor' ? (viewDetailsMatch.visitingDate ? new Date(viewDetailsMatch.visitingDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A') : (viewDetailsMatch.inquiryDate ? new Date(viewDetailsMatch.inquiryDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A')}
                             </p>
                           </div>
                           {viewDetailsMatch.branchId && (
                             <div className="group">
                               <p className="text-slate-400 uppercase text-[10px] font-[900] tracking-widest mb-1.5 group-hover:text-orange-500 transition-colors">Branch</p>
                               <p className="font-black text-blue-700 text-sm">{viewDetailsMatch.branchId?.name || viewDetailsMatch.branchId || 'N/A'}</p>
                             </div>
                           )}
                        </div>

                        <div className="group pt-2">
                          <p className="text-slate-400 uppercase text-[10px] font-[900] tracking-widest mb-1.5 group-hover:text-orange-500 transition-colors">Attended By</p>
                          <div className="flex items-center gap-2">
                             <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-black text-[10px]">
                               {(viewDetailsMatch.attendedBy?.name || 'S').charAt(0)}
                             </div>
                             <p className="font-black text-slate-800 text-sm">{viewDetailsMatch.attendedBy?.name || viewDetailsMatch.attendedBy?.username || 'System'}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {viewDetailsMatch.remarks && (
                       <div className="mt-10 p-6 bg-slate-50 rounded-[2rem] border border-slate-100 group hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 transition-all">
                          <p className="text-slate-400 uppercase text-[10px] font-[900] tracking-widest mb-2 group-hover:text-orange-500 transition-colors">Staff Remarks</p>
                          <p className="text-sm font-bold text-slate-700 italic leading-relaxed">"{viewDetailsMatch.remarks}"</p>
                       </div>
                    )}
                  </div>
                </div>

                <div className="p-6 bg-white border-t border-slate-100 flex gap-4 sticky bottom-0 z-10">
                  <button
                    type="button"
                    onClick={() => {
                      handleFillFromProfile(viewDetailsMatch);
                      setViewDetailsMatch(null);
                    }}
                    className="flex-1 bg-gradient-to-r from-orange-600 to-red-600 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-orange-200 flex items-center justify-center gap-2 group"
                  >
                    <UserCheck size={20} className="group-hover:animate-bounce" />
                    Convert to Admission
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewDetailsMatch(null)}
                    className="px-8 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-slate-200 transition-all"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
          {renderStepHeader()}

          <div className={`grid grid-cols-1 ${matches.length > 0 && step === 1 ? 'lg:grid-cols-4' : ''} gap-8`}>
            <div className={`${matches.length > 0 && step === 1 ? 'lg:col-span-3' : ''}`}>
              {duplicateStudent && step === 1 && (
                <div className="bg-red-50 border border-red-200 p-3 mb-6 rounded-lg flex justify-between items-center shadow-sm animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="bg-red-100 p-2 rounded-full">
                      <Search className="text-red-600" />
                    </div>
                    <div>
                      <p className="text-red-800 font-bold text-sm">
                        Duplicate Student Found!
                      </p>
                      <p className="text-red-700 text-xs">
                        Student with this name already exists.
                      </p>
                    </div>
                  </div>
                </div>
              )}

          {step === 1 && (
            <div className="grid grid-cols-12 gap-5 animate-fade-in-up">
              
              {/* Branch Selection for Super Admin */}
              {user?.role === 'Super Admin' && (
                  <div className="col-span-12 bg-blue-50 p-4 rounded border-2 border-blue-100 mb-2">
                       <label className="label text-blue-800 font-bold block mb-2">
                          Select Branch for this Student <span className="text-red-500">*</span>
                       </label>
                       <select 
                          {...register("branchId", { required: "Branch is required for Super Admin" })}
                          className={`input border-blue-300 w-full ${errors.branchId ? "border-red-500" : ""}`}
                       >
                           <option value="">-- Select Branch --</option>
                           {branches.map(b => (
                               <option key={b._id} value={b._id}>{b.name} ({b.shortCode})</option>
                           ))}
                       </select>
                       {errors.branchId && <p className="text-red-500 text-xs mt-1">{errors.branchId.message}</p>}
                  </div>
              )}
              <div className="col-span-12 md:col-span-4">
                <label className="label">Admission Date</label>
                <input
                  type="date"
                  {...register("admissionDate", { required: "Admission Date is required" })}
                  className={`input ${errors.admissionDate ? "border-red-500" : ""}`}
                />
                {errors.admissionDate && <p className="text-red-500 text-xs mt-1">{errors.admissionDate.message}</p>}
              </div>
              <div className="col-span-12 md:col-span-4">
                <label className="label">Aadhar Card No</label>
                <input
                  {...register("aadharCard", { 
                    validate: (value) => {
                      if (!value || value.trim() === '') return true; // Optional field
                      if (value.length !== 12) return "Must be exactly 12 digits";
                      if (!/^[0-9]{12}$/.test(value)) return "Only numbers allowed";
                      return true;
                    }
                  })}
                  placeholder="12 Digit Number (Optional)"
                  className={`input ${errors.aadharCard ? "border-red-500" : ""}`}
                  maxLength={12}
                  onInput={(e) => { if (e.target.value.length > 12) e.target.value = e.target.value.slice(0, 12); }}
                />
                {errors.aadharCard && <p className="text-red-500 text-xs mt-1">{errors.aadharCard.message}</p>}
              </div>
              <div className="col-span-12 md:col-span-4 flex justify-center">
                <div className="flex flex-col items-center">
                  <ProfileImageUploader
                    value={watch('studentPhoto')}
                    onChange={(file) => setValue('studentPhoto', file)}
                    onDelete={() => {
                      setValue('studentPhoto', null);
                      setPreviewImage(null);
                    }}
                    onProcessingChange={(processing) => setIsImageProcessing(processing)}
                    size="w-24 h-24"
                    name="studentPhoto"
                  />
                  <span className="block text-center text-xs text-blue-600 font-bold mt-2">
                    Upload Photo
                  </span>
                </div>
              </div>

              <div className="col-span-12 md:col-span-3">
                <label className="label">First Name <span className="text-red-500">*</span></label>
                <input
                  {...register("firstName", { required: "First Name is required" })}
                  className={`input ${errors.firstName ? "border-red-500" : ""}`}
                  placeholder="Student Name"
                  onInput={(e) => {
                      setValue('firstName', formatInputText(e.target.value), { shouldValidate: true });
                  }}
                />
                {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName.message}</p>}
              </div>
              <div className="col-span-6 md:col-span-2">
                <label className="label">2. Relation</label>
                <select
                  {...register("relationType")}
                  className="input bg-gray-50"
                >
                  <option value="Father">Father</option>
                  <option value="Husband">Husband</option>
                </select>
              </div>
              <div className="col-span-6 md:col-span-3">
                <label className="label">2. {watchRelation} Name</label>
                <input
                  {...register("middleName")}
                  className="input"
                  placeholder={`${watchRelation}'s Name`}
                  onInput={(e) => {
                      setValue('middleName', formatInputText(e.target.value), { shouldValidate: true });
                  }}
                />
              </div>
              <div className="col-span-12 md:col-span-4">
                <label className="label">2. Last Name <span className="text-red-500">*</span></label>
                <input
                  {...register("lastName", { required: "Last Name is required" })}
                  className={`input ${errors.lastName ? "border-red-500" : ""}`}
                  placeholder="Surname"
                  onInput={(e) => {
                      setValue('lastName', formatInputText(e.target.value), { shouldValidate: true });
                  }}
                />
                {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName.message}</p>}
              </div>

              <div className="col-span-6 md:col-span-3">
                <label className="label">3. Occupation Type</label>
                <select {...register("occupationType")} className="input">
                  <option value="Student">Student</option>
                  <option value="Service">Service</option>
                  <option value="Business">Business</option>
                  <option value="Unemployed">Unemployed</option>
                </select>
              </div>
              <div className="col-span-6 md:col-span-3">
                <label className="label">3. Occupation Name</label>
                <input 
                  {...register("occupationName")} 
                  className="input" 
                  onInput={(e) => setValue('occupationName', formatInputText(e.target.value))}
                />
              </div>
              <div className="col-span-12 md:col-span-6">
                <label className="label">3. Mother Name</label>
                <input 
                  {...register("motherName")} 
                  className="input" 
                  onInput={(e) => setValue('motherName', formatInputText(e.target.value))}
                />
              </div>

              <div className="col-span-12 md:col-span-5">
                <label className="label">4. E-mail</label>
                <input
                  type="email"
                  {...register("email")}
                  className="input"
                  placeholder="examle@mail.com"
                />
              </div>
              <div className="col-span-6 md:col-span-3">
                <label className="label">4. Date of Birth <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  {...register("dob", { required: "Date of Birth is required" })}
                  className={`input ${errors.dob ? "border-red-500" : ""}`}
                />
                {errors.dob && <p className="text-red-500 text-xs mt-1">{errors.dob.message}</p>}
              </div>
              <div className="col-span-6 md:col-span-4">
                <label className="label">4. Gender <span className="text-red-500">*</span></label>
                <div className="flex gap-4 mt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="Male"
                      {...register("gender", { required: "Gender is required" })}
                      className="text-blue-600"
                    />{" "}
                    Male
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="Female"
                      {...register("gender", { required: "Gender is required" })}
                      className="text-pink-600"
                    />{" "}
                    Female
                  </label>
                </div>
                {errors.gender && <p className="text-red-500 text-xs mt-1">{errors.gender.message}</p>}
              </div>

              <div className="col-span-12 md:col-span-4">
                <label className="label">5. Home Contact</label>
                <input
                  {...register("contactHome", { maxLength: 10 })}
                  className="input"
                  placeholder="Landline/Other"
                  maxLength={10}
                  onInput={(e) => { if (e.target.value.length > 10) e.target.value = e.target.value.slice(0, 10); }}
                />
              </div>
              <div className="col-span-12 md:col-span-4">
                <label className="label">5. Student Contact (10 Digits)</label>
                <input
                  {...register("mobileStudent", { maxLength: 10 })}
                  className="input"
                  maxLength={10}
                  onInput={(e) => { if (e.target.value.length > 10) e.target.value = e.target.value.slice(0, 10); }}
                />
              </div>
              <div className="col-span-12 md:col-span-4">
                <label className="label text-blue-700">
                  5. Parent Contact <span className="text-red-500">*</span>
                </label>
                <input
                  {...register("mobileParent", {
                    required: "Parent Contact is required",
                    pattern: { value: /^[0-9]{10}$/, message: "Must be 10 digits" }
                  })}
                  className={`input border-blue-300 bg-blue-50 ${errors.mobileParent ? "border-red-500" : ""}`}
                  maxLength={10}
                  onInput={(e) => { if (e.target.value.length > 10) e.target.value = e.target.value.slice(0, 10); }}
                />
                {errors.mobileParent && <p className="text-red-500 text-xs mt-1">{errors.mobileParent.message}</p>}
              </div>

              <div className="col-span-12">
                <label className="label">6. Education</label>
                <div className="flex gap-2">
                    <select
                      {...register("education")}
                      className="input w-full"
                    >
                      <option value="">-- Select Education --</option>
                      {educations.map((opt, i) => (
                        <option key={opt._id || i} value={opt.name}>
                          {opt.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowEduModal(true)}
                      className="p-2 bg-blue-50 text-blue-600 rounded border hover:bg-blue-100 flex-shrink-0"
                      title="Add New Education"
                    >
                      <Plus size={20} />
                    </button>
                </div>
              </div>

              <div className="col-span-12">
                <label className="label">
                  7. Address (House No, Building, Street) <span className="text-red-500">*</span>
                </label>
                <textarea
                  {...register("address", { required: "Address is required" })}
                  rows="2"
                  className={`input ${errors.address ? "border-red-500" : ""}`}
                  onInput={(e) => setValue('address', formatInputText(e.target.value))}
                ></textarea>
                {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address.message}</p>}
              </div>

              <div className="col-span-12 md:col-span-4">
                <label className="label">8. State <span className="text-red-500">*</span></label>
                <select
                  {...register("state", { required: "State is required" })}
                  className={`input ${errors.state ? "border-red-500" : ""}`}
                  onChange={(e) => {
                    const selectedState = e.target.value;
                    setValue('state', selectedState);
                    setValue('city', ''); // Reset city when state changes
                    
                    // Filter cities by selected state
                    const stateObj = states.find(s => s.name === selectedState);
                    if (stateObj) {
                      const citiesForState = cities.filter(c => 
                        c.stateId?._id === stateObj._id || c.stateId === stateObj._id
                      );
                      setFilteredCities(citiesForState);
                    } else {
                      setFilteredCities([]);
                    }
                  }}
                >
                  <option value="">-- Select State --</option>
                  {states.filter(s => s.isActive).map(state => (
                    <option key={state._id} value={state.name}>{state.name}</option>
                  ))}
                </select>
                {errors.state && <p className="text-red-500 text-xs mt-1">{errors.state.message}</p>}
              </div>
              <div className="col-span-12 md:col-span-4">
                <label className="label">8. City <span className="text-red-500">*</span></label>
                <select
                  {...register("city", { required: "City is required" })}
                  className={`input ${errors.city ? "border-red-500" : ""}`}
                  disabled={!watchState}
                >
                  <option value="">-- Select City --</option>
                  {filteredCities.map(city => (
                    <option key={city._id} value={city.name}>{city.name}</option>
                  ))}
                </select>
                {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city.message}</p>}
              </div>
              <div className="col-span-12 md:col-span-4">
                <label className="label">8. Pincode</label>
                <input {...register("pincode")} className="input" />
              </div>

              <div className="col-span-12 bg-gray-50 p-4 rounded border-dashed border-2 border-gray-200">
                <label className="label text-purple-700">
                  9. Reference Details
                </label>
                <div className="flex gap-4 items-start" title={referenceLockTitle}>
                  <div className="w-full">
                    <select
                      {...register("reference")}
                      className="input w-full disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                      disabled={isReferenceLocked}
                      title={referenceLockTitle}
                    >
                    <option value="Direct">Direct / Walk-in</option>
                    <optgroup label="Staff">
                        {employees?.map((e) => (
                          <option key={e._id} value={e.name}>
                            {e.name} ({e.type})
                          </option>
                        ))}
                    </optgroup>
                    <optgroup label="External References">
                        {references.map((r, i) => (
                             <option key={r._id || i} value={r.name}>{r.name}</option>
                        ))}
                    </optgroup>
                    </select>
                    {isReferenceLocked && (
                      <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-amber-700">
                        <Lock size={12} /> Only Super Admin can change fetched reference.
                      </div>
                    )}
                  </div>
                  {!isReferenceLocked && (
                    <button
                      type="button"
                      onClick={() => setShowRefModal(true)}
                      className="p-2 bg-blue-50 text-blue-600 rounded border hover:bg-blue-100 flex-shrink-0"
                      title="Add New Reference"
                    >
                      <Plus size={20} />
                    </button>
                  )}
                </div>
              </div>

              <div className="col-span-12 flex justify-end mt-4">
                <button
                  type="button"
                  onClick={async () => {
                    const step1Fields = [
                      "admissionDate", "aadharCard", "firstName", "middleName", "lastName",
                      "relationType", "occupationType", "occupationName", "motherName",
                      "email", "dob", "gender", "contactHome", "mobileStudent", "mobileParent",
                      "education", "address", "state", "city", "pincode", "reference"
                    ];
                    
                    // Conditionally add branchId if it's being rendered
                    if (user?.role === 'Super Admin') {
                        step1Fields.push("branchId");
                    }

                    const isValid = await trigger(step1Fields);
                    
                    // DEBUG: Log errors if validation fails
                    if (!isValid) {
                        if (import.meta.env.DEV) {
                           console.log("[DEV] Validation Failed. Errors:", errors);
                           console.log("[DEV] Current Form Values:", getValues());
                        }
                        // Also show the specific error in the toast for easier debugging
                        const errorFields = Object.keys(errors).join(", ");
                        toast.error(`Validation Failed. Check: ${errorFields}`);
                    }
                    
                    if (import.meta.env.DEV) {
                        console.log("[DEV] Fields Valid? ", isValid);
                        console.log("[DEV] Proceeding to Step 2 with values:", getValues());
                    }

                    if (isValid) {
                        setStep(2);
                    } else {
                        // Toast is now handled above for better detail
                    }
                  }}
                  className="btn-primary"
                >
                  Next: Course Details <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="animate-fade-in-up space-y-6">
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-gray-100 p-3 font-bold text-gray-700 border-b">
                  A. Select Course
                </div>
                <div className="max-h-60 overflow-y-auto">
                  {courses.length === 0 ? (
                    <p className="p-4 text-center text-gray-500">
                      No Courses Found
                    </p>
                  ) : (
                    <div>
                    <table className="hidden md:table w-full text-sm">
                      <thead className="bg-gray-50 text-left sticky top-0">
                        <tr>
                          <th className="p-2">Name</th>
                          <th className="p-2">Fees</th>
                          <th className="p-2">Duration</th>
                          <th className="p-2">Select</th>
                        </tr>
                      </thead>
                      <tbody>
                        {courses.map((c) => (
                          <tr
                            key={c._id}
                            className={`border-b hover:bg-blue-50 cursor-pointer ${
                              watchCourseSelection === c._id
                                ? "bg-blue-100"
                                : ""
                            }`}
                            onClick={() => setValue("selectedCourseId", c._id)}
                          >
                            <td className="p-2 font-medium">{c.name}</td>
                            <td className="p-2">₹{c.courseFees}</td>
                            <td className="p-2">
                              {c.duration} {c.durationType}
                            </td>
                            <td className="p-2">
                              <input
                                type="radio"
                                value={c._id}
                                {...register("selectedCourseId")}
                                checked={watchCourseSelection === c._id}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="md:hidden space-y-2 p-2">
                      {courses.map((c) => {
                        const isSelected = watchCourseSelection === c._id;
                        return (
                          <div
                            key={c._id}
                            onClick={() => setValue("selectedCourseId", c._id)}
                            className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition ${
                              isSelected
                                ? "border-blue-500 bg-blue-50 shadow-sm"
                                : "border-gray-200 bg-white hover:border-blue-300"
                            }`}
                          >
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-gray-800 text-sm truncate">{c.name}</p>
                              <p className="text-xs text-gray-500 mt-0.5">
                                ₹{c.courseFees} • {c.duration} {c.durationType}
                              </p>
                            </div>
                            <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ml-2 ${
                              isSelected ? "border-blue-600 bg-blue-600" : "border-gray-300"
                            }`}>
                              {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    </div>
                  )}
                </div>
              </div>

              {watchCourseSelection && (
                <div className="bg-slate-50 p-4 rounded border border-slate-200">
                  <div className="font-bold text-slate-700 mb-3">
                    B. Batch & Fee Config
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="sm:col-span-2 lg:col-span-4 mb-2">
                      <label className="label mb-2">Select Batch <span className="text-red-500">*</span></label>
                      <div className="border rounded-lg overflow-hidden max-h-60 overflow-y-auto bg-white shadow-sm">
                        <table className="hidden md:table w-full text-sm">
                          <thead className="bg-gray-100 text-left sticky top-0 border-b">
                            <tr>
                              <th className="p-3 w-12 text-center">#</th>
                              <th className="p-3">Batch Name</th>
                              <th className="p-3">Batch Time</th>
                              <th className="p-3 text-center text-blue-800">
                                Active Students <br />
                                <span className="text-xs font-normal">
                                  (In Selected Course)
                                </span>
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {batches
                              .filter(
                                (b) =>
                                  b.course === watchCourseSelection ||
                                  b.courses?.some(
                                    (c) => (c._id || c) === watchCourseSelection
                                  )
                              )
                              .map((b) => {
                                const activeCount =
                                  b.courseCounts?.[watchCourseSelection] || 0;
                                const isSelected =
                                  watchSelectedBatch === b.name;

                                return (
                                  <tr
                                    key={b._id}
                                    onClick={() =>
                                      setValue("selectedBatch", b.name)
                                    }
                                    className={`border-b cursor-pointer transition ${
                                      isSelected
                                        ? "bg-blue-100 border-blue-200"
                                        : "hover:bg-gray-50"
                                    }`}
                                  >
                                    <td className="p-3 text-center">
                                      <input
                                        type="radio"
                                        name="batchSelectGroup" 
                                        checked={isSelected}
                                        onChange={() =>
                                          setValue("selectedBatch", b.name)
                                        }
                                        className="cursor-pointer w-4 h-4 text-blue-600"
                                      />
                                    </td>
                                    <td className="p-3 font-medium text-gray-800">
                                      {b.name}
                                    </td>
                                    <td className="p-3 text-gray-600">
                                      {b.startTime} - {b.endTime}
                                    </td>
                                    <td className="p-3 text-center">
                                      <span
                                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                                          activeCount > 0
                                            ? "bg-green-100 text-green-800"
                                            : "bg-gray-100 text-gray-500"
                                        }`}
                                      >
                                        {activeCount}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            {batches.filter(
                              (b) =>
                                b.course === watchCourseSelection ||
                                b.courses?.some(
                                  (c) => (c._id || c) === watchCourseSelection
                                )
                            ).length === 0 && (
                              <tr>
                                <td
                                  colSpan="4"
                                  className="p-4 text-center text-gray-500"
                                >
                                  No batches available for this course.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                      <div className="md:hidden space-y-2 mt-2">
                        {batches
                          .filter(
                            (b) =>
                              b.course === watchCourseSelection ||
                              b.courses?.some(
                                (c) => (c._id || c) === watchCourseSelection
                              )
                          )
                          .map((b) => {
                            const activeCount =
                              b.courseCounts?.[watchCourseSelection] || 0;
                            const isSelected =
                              watchSelectedBatch === b.name;
                            return (
                              <div
                                key={b._id}
                                onClick={() =>
                                  setValue("selectedBatch", b.name)
                                }
                                className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition ${
                                  isSelected
                                    ? "border-blue-500 bg-blue-50 shadow-sm"
                                    : "border-gray-200 bg-white hover:border-blue-300"
                                }`}
                              >
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-gray-800 text-sm">{b.name}</p>
                                  <p className="text-xs text-gray-500 mt-0.5">
                                    {b.startTime} - {b.endTime}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                    activeCount > 0
                                      ? "bg-green-100 text-green-800"
                                      : "bg-gray-100 text-gray-500"
                                  }`}>
                                    {activeCount}
                                  </span>
                                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                    isSelected ? "border-blue-600 bg-blue-600" : "border-gray-300"
                                  }`}>
                                    {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        {batches.filter(
                          (b) =>
                            b.course === watchCourseSelection ||
                            b.courses?.some(
                              (c) => (c._id || c) === watchCourseSelection
                            )
                        ).length === 0 && (
                          <p className="p-4 text-center text-gray-500 text-sm">
                            No batches available for this course.
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Start Date and Payment Plan - Now available in Edit Mode too */}
                    <div className="sm:col-span-1">
                      <label className="label">Start Date {isUpdateMode && <span className="text-xs text-gray-500">(Original: {currentStudent?.admissionDate?.split("T")[0]})</span>}</label>
                      <input
                        type="date"
                        {...register("batchStartDate")}
                        className="input"
                        defaultValue={isUpdateMode ? (currentStudent?.batchStartDate?.split("T")[0] || currentStudent?.admissionDate?.split("T")[0]) : new Date().toISOString().split("T")[0]}
                      />
                    </div>
                    <div className="sm:col-span-1">
                      <label className="label">Payment Plan</label>
                      <select 
                        {...register("paymentType")} 
                        className="input"
                        onChange={(e) => {
                          setValue("paymentType", e.target.value);
                          // Trigger re-calculation when payment plan changes
                          if (watchCourseSelection && watchSelectedBatch) {
                            setTimeout(() => handleAddCourseToList(), 100);
                          }
                        }}
                      >
                        <option value="One Time">One Time</option>
                        <option value="Monthly">Monthly</option>
                      </select>
                    </div>

                    {/* Add to List button - moved here for better alignment */}
                    <div className="sm:col-span-2 flex justify-end items-end">
                      <button
                        type="button"
                        onClick={handleAddCourseToList}
                        className="bg-slate-800 text-white px-4 py-2 rounded text-sm font-bold flex items-center gap-2 hover:bg-black h-10 w-full sm:w-auto px-8 justify-center shadow-md transition-all active:scale-95"
                      >
                        <Plus size={16} /> Add to List
                      </button>
                    </div>

                    {/* Document Verification Section */}
                    <div className="col-span-1 sm:col-span-2 lg:col-span-4 bg-purple-50 p-4 rounded border border-purple-200 mt-2">
                      <label className="label text-purple-800 mb-3 block font-bold">Document Verification Status</label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-700">
                          <input
                            type="checkbox"
                            {...register("isPhotos")}
                            className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                          />
                          Photo
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-700">
                          <input
                            type="checkbox"
                            {...register("isIDProof")}
                            className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                          />
                          ID Proof
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-700">
                          <input
                            type="checkbox"
                            {...register("isMarksheetCertificate")}
                            className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                          />
                          Marksheet
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-700">
                          <input
                            type="checkbox"
                            {...register("isAddressProof")}
                            className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                          />
                          Address
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Preview Section - different display for Edit Mode */}
              {previewCourses.length > 0 && (
                <div className="border rounded-lg overflow-hidden shadow-sm">
                  <div className="bg-slate-800 text-white p-3 font-bold text-sm">
                    C. Admission Preview
                  </div>
                  <table className="hidden md:table w-full text-sm">
                    <thead className="bg-gray-100 border-b text-left">
                      <tr>
                        <th className="p-3">Sr.No</th>
                        <th className="p-3">Course</th>
                        <th className="p-3">Batch</th>
                        <th className="p-3">Batch Time</th>
                        <th className="p-3">Course Fees</th>
                        <th className="p-3">Duration</th>
                        <th className="p-3">Registration Fees</th>
                        <th className="p-3">Monthly Fees</th>
                        {!isUpdateMode && <th className="p-3">Action</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {previewCourses.map((item, index) => (
                        <tr key={item.id} className="border-b bg-white">
                          <td className="p-3">{index + 1}</td>
                          <td className="p-3 font-medium">{item.courseName}</td>
                          <td className="p-3">{item.batch}</td>
                          <td className="p-3">{item.batchTime}</td>
                          <td className="p-3">₹{item.fees}</td>
                          <td className="p-3">
                             {courses.find(c => c._id === item.courseId)?.duration} {courses.find(c => c._id === item.courseId)?.durationType}
                          </td>
                          <td className="p-3">
                            {item.registrationFees !== undefined ? `₹${item.registrationFees}` : (item.emiConfig ? `₹${item.emiConfig.registrationFees}` : '-')}
                          </td>
                          <td className="p-3">
                            {item.emiConfig ? `₹${item.emiConfig.monthlyInstallment} x ${item.emiConfig.months}` : '-'}
                          </td>
                          {!isUpdateMode && (
                            <td className="p-3 flex gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setValue("selectedCourseId", item.courseId);
                                  setValue("selectedBatch", item.batch);
                                  setValue("batchStartDate", item.startDate);
                                  setValue("paymentType", item.paymentType);
                                  const newList = previewCourses.filter((_, i) => i !== index);
                                  setPreviewCourses(newList);
                                }}
                                className="text-blue-500 hover:text-blue-700"
                                title="Edit"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const newList = previewCourses.filter((_, i) => i !== index);
                                  setPreviewCourses(newList);
                                }}
                                className="text-red-500 hover:text-red-700"
                                title="Delete"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                    {previewCourses.length > 0 && previewCourses[0].paymentType === "Monthly" && previewCourses[0].emiConfig && (
                      <tfoot className="bg-yellow-50 text-xs text-yellow-800">
                        <tr>
                          <td colSpan={isUpdateMode ? "8" : "9"} className="p-3">
                            <strong>Monthly Breakdown:</strong> Total: ₹
                            {previewCourses[0].fees} | Registration: ₹{previewCourses[0].emiConfig.registrationFees} | EMI: ₹{previewCourses[0].emiConfig.monthlyInstallment} x{" "}
                            {previewCourses[0].emiConfig.months} Months
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                    <div className="md:hidden divide-y divide-gray-100">
                      {previewCourses.map((item, index) => (
                        <div key={item.id} className="p-3 space-y-2">
                          <div className="flex justify-between items-start">
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-gray-800 text-sm">{item.courseName}</p>
                              <p className="text-xs text-gray-500">{item.batch} | {item.batchTime}</p>
                            </div>
                            <span className="text-sm font-bold text-green-700 flex-shrink-0 ml-2">₹{item.fees}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                            <div>
                              <span className="text-gray-400">Duration:</span> {courses.find(c => c._id === item.courseId)?.duration} {courses.find(c => c._id === item.courseId)?.durationType}
                            </div>
                            <div>
                              <span className="text-gray-400">Registration:</span> {item.registrationFees !== undefined ? `₹${item.registrationFees}` : (item.emiConfig ? `₹${item.emiConfig.registrationFees}` : '-')}
                            </div>
                            <div>
                              <span className="text-gray-400">Monthly:</span> {item.emiConfig ? `₹${item.emiConfig.monthlyInstallment} x ${item.emiConfig.months}` : '-'}
                            </div>
                            <div>
                              <span className="text-gray-400">Start:</span> {item.startDate}
                            </div>
                          </div>
                          {item.paymentType === "Monthly" && item.emiConfig && (
                            <p className="text-xs text-yellow-700 bg-yellow-50 p-2 rounded">
                              <strong>Monthly Breakdown:</strong> Total: ₹{item.fees} | Registration: ₹{item.emiConfig.registrationFees} | EMI: ₹{item.emiConfig.monthlyInstallment} x {item.emiConfig.months} Months
                            </p>
                          )}
                          {!isUpdateMode && (
                            <div className="flex gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setValue("selectedCourseId", item.courseId);
                                  setValue("selectedBatch", item.batch);
                                  setValue("batchStartDate", item.startDate);
                                  setValue("paymentType", item.paymentType);
                                  const newList = previewCourses.filter((_, i) => i !== index);
                                  setPreviewCourses(newList);
                                }}
                                className="text-xs text-blue-600 font-semibold px-3 py-1.5 rounded border border-blue-200 hover:bg-blue-50 flex items-center gap-1"
                              >
                                <Edit2 size={12} /> Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const newList = previewCourses.filter((_, i) => i !== index);
                                  setPreviewCourses(newList);
                                }}
                                className="text-xs text-red-600 font-semibold px-3 py-1.5 rounded border border-red-200 hover:bg-red-50 flex items-center gap-1"
                              >
                                <Trash2 size={12} /> Remove
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* Payment Option - Only show in Create Mode */}
              {!isUpdateMode && previewCourses.length > 0 && (
                <div className="bg-white p-6 rounded border shadow-sm mt-6">
                  <h3 className="font-bold text-lg text-gray-800 mb-4 border-b pb-2">
                    Admission Fee Payment
                  </h3>
                  <p className="text-gray-600 text-sm mb-4">
                    Do you want to add admission fee detail now?
                  </p>

                  <div className="flex gap-6">
                    <div
                      onClick={() => setPayAdmissionFee(true)}
                      className={`flex-1 border-2 p-4 rounded-lg cursor-pointer transition flex items-center justify-between
                                            ${
                                              payAdmissionFee === true
                                                ? "border-green-500 bg-green-50"
                                                : "border-gray-200 hover:border-green-300"
                                            }`}
                    >
                      <div>
                        <h4 className="font-bold text-green-700">
                          YES, Pay Now
                        </h4>
                        <p className="text-xs text-green-600">
                          Enter receipt details immediately.
                        </p>
                      </div>
                      <div
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                          payAdmissionFee === true
                            ? "border-green-600 bg-green-600 text-white"
                            : "border-gray-300"
                        }`}
                      >
                        {payAdmissionFee === true && <CheckCircle size={14} />}
                      </div>
                    </div>

                    <div
                      onClick={() => setPayAdmissionFee(false)}
                      className={`flex-1 border-2 p-4 rounded-lg cursor-pointer transition flex items-center justify-between
                                            ${
                                              payAdmissionFee === false
                                                ? "border-orange-500 bg-orange-50"
                                                : "border-gray-200 hover:border-orange-300"
                                            }`}
                    >
                      <div>
                        <h4 className="font-bold text-orange-700">
                          NO, Pay Later
                        </h4>
                        <p className="text-xs text-orange-600">
                          Save to 'Pending Admission Fees'.
                        </p>
                      </div>
                      <div
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                          payAdmissionFee === false
                            ? "border-orange-600 bg-orange-600 text-white"
                            : "border-gray-300"
                        }`}
                      >
                        {payAdmissionFee === false && <CheckCircle size={14} />}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-between mt-8">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="btn-secondary"
                >
                  <ChevronLeft size={16} /> Back to Personal
                </button>

                {/* Create Mode Buttons */}
                {!isUpdateMode && payAdmissionFee === true && (
                  <button
                    type="button"
                    onClick={() => {
                      const amountToSet = previewCourses[0].admissionFees;
                      setValue("amountPaid", amountToSet);
                      setStep(3);
                    }}
                    className="btn-primary"
                  >
                    Proceed to Fees <ChevronRight size={16} />
                  </button>
                )}

                {!isUpdateMode && payAdmissionFee === false && (
                  <button
                    type="submit"
                    disabled={isLoading || isSubmitting}
                    className={`bg-orange-600 text-white px-6 py-2 rounded font-bold flex items-center gap-2 shadow opacity-90 transition ${
                      isLoading || isSubmitting
                        ? "cursor-not-allowed opacity-50"
                        : "hover:bg-orange-700 hover:opacity-100"
                    }`}
                  >
                    <Save size={18} />
                    {isLoading || isSubmitting ? "Saving..." : "Save & Admit (Pay Later)"}
                  </button>
                )}

                {/* Edit Mode Button - Direct Update */}
                {isUpdateMode && previewCourses.length > 0 && (
                  <button
                    type="submit"
                    disabled={isLoading || isSubmitting}
                    className={`bg-blue-600 text-white px-6 py-2 rounded font-bold flex items-center gap-2 shadow transition ${
                      isLoading || isSubmitting
                        ? "cursor-not-allowed opacity-50"
                        : "hover:bg-blue-700"
                    }`}
                  >
                    <Save size={18} />
                    {isLoading || isSubmitting ? "Updating..." : "Update Admission"}
                  </button>
                )}
              </div>
            </div>
          )}

          {step === 3 && payAdmissionFee === true && (
            <div className="animate-fade-in-up">
              <div className="max-w-2xl mx-auto border rounded-xl shadow-lg bg-white overflow-hidden">
                <div className="bg-gray-800 text-white p-4 font-bold flex justify-between items-center">
                  <span>
                    <CreditCard className="inline mr-2" /> Fee Receipt Details
                  </span>

                  <span className="text-xs bg-gray-700 px-2 py-1 rounded">
                    Step 3 of 3
                  </span>
                </div>
                <div className="p-6 grid grid-cols-2 gap-6">
                  {/* Enhanced Student Identity Card for Step 3 */}
                  <div className="col-span-2 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-4 flex items-center gap-6 mb-2">
                       <div className="p-1 bg-white rounded-lg shadow-sm border border-blue-100">
                           {(previewImage || (watch('studentPhoto') && typeof watch('studentPhoto') === 'string')) ? (
                              <img 
                                  src={previewImage || watch('studentPhoto')} 
                                  alt="Student" 
                                  className="w-24 h-24 rounded-md object-contain bg-white border border-gray-200"
                              />
                           ) : (
                               <div className="w-24 h-24 bg-gray-200 rounded-md flex items-center justify-center text-gray-400 text-xs text-center p-2">
                                  No Photo
                               </div>
                           )}
                       </div>
                       <div>
                           <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                               {watch('firstName')} {watch('lastName')}
                               <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full border border-green-200 uppercase">Admitting</span>
                           </h3>
                           <p className="text-sm text-gray-600 mt-1">
                               Course: <span className="font-semibold text-blue-700">{previewCourses[0]?.courseName}</span>
                           </p>
                           <p className="text-sm text-gray-600">
                               Batch: <span className="font-semibold">{previewCourses[0]?.batch}</span>
                           </p>
                           <p className="text-sm text-gray-600">
                               Mobile: {watch('mobileStudent') || watch('mobileParent') || 'N/A'}
                           </p>
                       </div>
                  </div>

                  <div className="col-span-2 bg-blue-50 p-3 rounded text-blue-800 text-sm">
                    <strong>Course Fees:</strong> ₹{previewCourses[0]?.fees}
                    <br />
                    <strong>Admission Fees:</strong> ₹
                    {previewCourses[0]?.admissionFees}
                    {previewCourses[0]?.paymentType === "One Time" && (
                      <>
                        <br />
                        {/* <strong className="text-orange-700">
                          Pay Admission Now:
                        </strong>{" "}
                        ₹{previewCourses[0]?.admissionFees}
                        <br /> */}
                        <span className="text-xs">
                          Remaining Fees (₹{previewCourses[0]?.fees}) will be pending.
                        </span>
                      </>
                    )}
                    {previewCourses[0]?.paymentType === "Monthly" && (
                      <>
                        <br />
                        {/* <strong className="text-orange-700">
                          Pay Admission Now:
                        </strong>{" "}
                        ₹{previewCourses[0]?.admissionFees}
                        <br /> */}
                        <span className="text-xs">
                          Registration fees (₹
                          {previewCourses[0]?.emiConfig?.registrationFees}) will
                          be paid during registration
                        </span>
                      </>
                    )}
                  </div>

                  <div>
                    <label className="label">Receipt No</label>
                    <input
                      className="input bg-gray-100 text-gray-500 cursor-not-allowed"
                      value={nextReceiptNo}
                      disabled
                    />
                  </div>
                  <div>
                    <label className="label">Receipt Date</label>
                    <input
                      type="date"
                      {...register("receiptDate")}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="label">Amount Paid (₹) *</label>
                    <input
                      type="number"
                      {...register("amountPaid", { required: true })}
                      className="input border-l-4 border-green-500 text-lg font-bold"
                      onChange={(e) => {
                        const val = e.target.value;
                        const maxFee = previewCourses[0]?.admissionFees || 0;
                        
                        // Allow empty input for user to type
                        if (val === "") {
                           setValue("amountPaid", "");
                           return;
                        }

                        const numVal = Number(val);
                        
                        // Prevent typing values greater than max fee
                        if (numVal > maxFee) {
                           toast.error(`Amount cannot exceed the Course Admission Fee (₹${maxFee})`);
                           // Keep the previous valid value or just clear it
                           setValue("amountPaid", maxFee.toString()); 
                        } else {
                           setValue("amountPaid", val);
                        }
                      }}
                    />
                  </div>
                  <div>
                      <label className="label">Payment Mode</label>
                      <select
                        {...register("receiptPaymentMode")}
                        className="input"
                      >
                        <option value="Cash">Cash</option>
                        <option value="Cheque">Cheque</option>
                        <option value="Online/UPI">Online/UPI</option>
                      </select>
                  </div>
                  
                  {/* Dynamic Payment Fields */}
                  {receiptPaymentMode === "Cheque" && (
                     <>
                        <div className="col-span-2">
                          <label className="label">Bank Name *</label>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {POPULAR_INDIAN_BANKS.map((bank) => (
                              <label key={bank} className="flex items-center gap-2 border rounded p-2 text-sm cursor-pointer hover:bg-blue-50">
                                <input
                                  type="radio"
                                  value={bank}
                                  {...register("receiptBankOption")}
                                  onChange={(e) => {
                                    setValue("receiptBankOption", e.target.value);
                                    setValue("bankName", e.target.value === "Other" ? "" : e.target.value);
                                  }}
                                />
                                {bank}
                              </label>
                            ))}
                          </div>
                        </div>
                        {receiptBankOption === "Other" && (
                          <div className="col-span-2 md:col-span-1">
                              <label className="label">Other Bank Name *</label>
                              <input
                                  {...register("bankName")}
                                  className="input"
                                  placeholder="Enter bank name"
                                  onChange={(e) => setValue('bankName', formatInputText(e.target.value))}
                              />
                          </div>
                        )}
                        <div className="col-span-2 md:col-span-1">
                            <label className="label">Cheque Number *</label>
                            <input {...register("chequeNumber")} className="input" placeholder="Cheque No" />
                        </div>
                        <div className="col-span-2 md:col-span-1">
                            <label className="label">Cheque Date *</label>
                            <input type="date" {...register("chequeDate")} className="input" />
                        </div>
                     </>
                  )}
                  
                  {receiptPaymentMode === "Online/UPI" && (
                     <>
                        <div className="col-span-2 md:col-span-1">
                          <label className="label">Payment Type *</label>
                          <select
                            {...register("onlinePaymentType")}
                            className="input"
                            onChange={(e) => {
                              setValue("onlinePaymentType", e.target.value);
                              setValue("onlineProviderOption", "");
                              setValue("paymentProviderName", "");
                              setValue("bankName", "");
                            }}
                          >
                            {ONLINE_PAYMENT_TYPES.map((type) => (
                              <option key={type} value={type}>{type}</option>
                            ))}
                          </select>
                        </div>

                        {onlinePaymentType === "UPI" ? (
                          <>
                            <div className="col-span-2">
                              <label className="label">UPI App / Provider *</label>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                {UPI_PROVIDERS.map((provider) => (
                                  <label key={provider} className="flex items-center gap-2 border rounded p-2 text-sm cursor-pointer hover:bg-blue-50">
                                    <input
                                      type="radio"
                                      value={provider}
                                      {...register("onlineProviderOption")}
                                      onChange={(e) => {
                                        setValue("onlineProviderOption", e.target.value);
                                        setValue("paymentProviderName", e.target.value === "Other" ? "" : e.target.value);
                                        setValue("bankName", e.target.value === "Other" ? "" : e.target.value);
                                      }}
                                    />
                                    {provider}
                                  </label>
                                ))}
                              </div>
                            </div>
                            {onlineProviderOption === "Other" && (
                              <div className="col-span-2 md:col-span-1">
                                <label className="label">UPI App Name *</label>
                                <input
                                  {...register("paymentProviderName")}
                                  className="input"
                                  placeholder="Enter UPI app name"
                                  onChange={(e) => {
                                    const value = formatInputText(e.target.value);
                                    setValue("paymentProviderName", value);
                                    setValue("bankName", value);
                                  }}
                                />
                              </div>
                            )}
                            {onlineProviderOption && (
                              <div className="col-span-2 md:col-span-1">
                                <label className="label">UPI ID / Number *</label>
                                <input
                                  {...register("upiId")}
                                  className="input"
                                  placeholder="example@upi or mobile number"
                                />
                              </div>
                            )}
                          </>
                        ) : onlinePaymentType === "Other" ? (
                          <>
                            <div className="col-span-2">
                              <label className="label">Payment Name *</label>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                {["Other"].map((provider) => (
                                  <label key={provider} className="flex items-center gap-2 border rounded p-2 text-sm cursor-pointer hover:bg-blue-50">
                                    <input
                                      type="radio"
                                      value={provider}
                                      {...register("onlineProviderOption")}
                                      onChange={(e) => {
                                        setValue("onlineProviderOption", e.target.value);
                                        setValue("paymentProviderName", e.target.value === "Other" ? "" : e.target.value);
                                        setValue("bankName", e.target.value === "Other" ? "" : e.target.value);
                                      }}
                                    />
                                    {provider}
                                  </label>
                                ))}
                              </div>
                            </div>
                            {(onlineProviderOption === "Other" || onlinePaymentType === "Other") && (
                              <div className="col-span-2 md:col-span-1">
                                <label className="label">Name *</label>
                                <input
                                  {...register("paymentProviderName")}
                                  className="input"
                                  placeholder="Enter payment name"
                                  onChange={(e) => {
                                    const value = formatInputText(e.target.value);
                                    setValue("paymentProviderName", value);
                                    setValue("bankName", value);
                                  }}
                                />
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="col-span-2">
                            <label className="label">Bank Name *</label>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                              {POPULAR_INDIAN_BANKS.map((bank) => (
                                <label key={bank} className="flex items-center gap-2 border rounded p-2 text-sm cursor-pointer hover:bg-blue-50">
                                  <input
                                    type="radio"
                                    value={bank}
                                    {...register("receiptBankOption")}
                                    onChange={(e) => {
                                      setValue("receiptBankOption", e.target.value);
                                      setValue("bankName", e.target.value === "Other" ? "" : e.target.value);
                                    }}
                                  />
                                  {bank}
                                </label>
                              ))}
                            </div>
                          </div>
                        )}

                        {(onlinePaymentType === "Net Banking" || onlinePaymentType === "Bank Transfer") && receiptBankOption === "Other" && (
                          <div className="col-span-2 md:col-span-1">
                              <label className="label">Other Bank Name *</label>
                              <input
                                  {...register("bankName")}
                                  className="input"
                                  placeholder="Enter bank name"
                                  onChange={(e) => setValue('bankName', formatInputText(e.target.value))}
                              />
                          </div>
                        )}
                        <div className="col-span-2 md:col-span-1">
                            <label className="label">Transaction Number *</label>
                            <input {...register("transactionId")} className="input" placeholder="UTR / Ref No / Transaction ID" />
                        </div>
                        <div className="col-span-2 md:col-span-1">
                            <label className="label">Transaction Date *</label>
                            <input type="date" {...register("transactionDate")} className="input" />
                        </div>
                        {onlinePaymentType !== "UPI" && (
                          <div className="col-span-2">
                              <label className="label">Payment Details</label>
                              <input {...register("paymentDetails")} className="input" placeholder="Account last 4 digits, note, or extra details" />
                          </div>
                        )}
                     </>
                  )}
                  <div className="col-span-2">
                    <label className="label">Remarks</label>
                    <input
                      {...register("remarks")}
                      className="input"
                      placeholder="e.g. Google Pay Trans ID..."
                      onChange={(e) => setValue('remarks', formatInputText(e.target.value))}
                    />
                  </div>
                </div>
                <div className="p-4 bg-gray-50 flex justify-between border-t">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="btn-secondary"
                    disabled={isLoading || isSubmitting}
                  >
                    Back to Course
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading || isSubmitting}
                    className={`bg-green-600 text-white px-6 py-2 rounded font-bold flex gap-2 shadow items-center transition ${
                      isLoading || isSubmitting
                        ? "cursor-not-allowed opacity-50"
                        : "hover:bg-green-700"
                    }`}
                  >
                    <Save size={18} />
                    {isLoading || isSubmitting
                      ? "Saving..."
                      : "Confirm Admission & Pay"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Matches Panel */}
        {matches.length > 0 && step === 1 && (
          <div className="lg:col-span-1">
            <div className="bg-orange-50 border border-orange-200 rounded-xl overflow-hidden sticky top-4 shadow-sm animate-fadeIn">
              <div className="bg-orange-600 text-white p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User size={20} />
                  <h3 className="font-bold text-sm">Matches ({matches.length})</h3>
                </div>
                <button 
                  type="button" 
                  onClick={() => setMatches([])}
                  className="hover:bg-white/20 p-1 rounded-full transition"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="max-h-[600px] overflow-y-auto p-3 space-y-3">
                {matches.map((match) => (
                  <div key={match._id} className="bg-white p-3 rounded-lg border border-orange-100 shadow-sm hover:border-orange-300 transition-colors group">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex flex-col gap-1">
                        <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded w-fit ${match.type === 'Visitor' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                          {match.type === 'Visitor' ? 'Visitor' : `${match.source || 'Inquiry'} - ${match.status || 'Open'}`}
                        </span>
                      </div>
                      <span className="text-[10px] text-gray-400">
                        {match.inquiryDate ? new Date(match.inquiryDate).toLocaleDateString() : (match.visitingDate ? new Date(match.visitingDate).toLocaleDateString() : '')}
                      </span>
                    </div>
                    <h4 className="font-bold text-gray-800 text-sm mb-1 group-hover:text-orange-600 transition-colors">
                      {match.type === 'Visitor' ? match.studentName : `${match.firstName || ''} ${match.lastName || ''}`}
                    </h4>
                    <div className="space-y-1 text-xs text-gray-600">
                      <p className="flex items-center gap-1.5"><Phone size={12}/> {match.type === 'Visitor' ? (match.mobileNumber || match.contactParent) : (match.contactStudent || match.contactParent)}</p>
                      <p className="flex items-center gap-1.5"><Book size={12}/> {match.type === 'Visitor' ? (match.course?.name || 'No Course') : (match.interestedCourse?.name || 'No Course')}</p>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button 
                        type="button"
                        onClick={() => handleFillFromProfile(match)}
                        className="flex-1 py-1.5 bg-orange-600 text-white rounded text-[11px] font-bold hover:bg-orange-700 transition-colors flex items-center justify-center gap-1 shadow-sm"
                      >
                        <ArrowRight size={14}/> Use Profile
                      </button>
                      <button 
                        type="button"
                        onClick={() => {
                          if (match.type === 'Inquiry') {
                            setViewInquiryMatch(match);
                          } else if (match.inquiryId && typeof match.inquiryId === 'object') {
                            // If it's a visitor with a populated inquiry, show the inquiry details
                            setViewInquiryMatch(match.inquiryId);
                          } else {
                            setViewDetailsMatch(match);
                          }
                        }}
                        className="p-1.5 bg-orange-100 text-orange-700 rounded hover:bg-orange-200 transition-colors"
                        title="View Details"
                      >
                        <Eye size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="bg-orange-100 p-2 text-[10px] text-orange-700 text-center italic border-t border-orange-200">
                Matches found in Inquiries or Visitors list
              </div>
            </div>
          </div>
        )}
      </div>
    </form>
  </div>

      <style>{`
                .label { display:block; font-size:0.75rem; font-weight:700; color:#4b5563; text-transform:uppercase; margin-bottom:0.3rem; letter-spacing:0.02em; }
                .input { width:100%; border:1px solid #d1d5db; padding:0.5rem; border-radius:0.375rem; outline:none; transition: all 0.2s; font-size:0.9rem; }
                .input:focus { border-color:#2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,0.1); }
                .btn-primary { background:#2563eb; color:white; padding:0.5rem 1.5rem; border-radius:0.375rem; display:flex; align-items:center; gap:0.5rem; font-weight:600; box-shadow: 0 1px 2px 0 rgba(0,0,0,0.05); transition: background 0.2s;}
                .btn-primary:hover { background:#1d4ed8; }
                .btn-secondary { background:white; color:#374151; border:1px solid #d1d5db; padding:0.5rem 1.25rem; border-radius:0.375rem; display:flex; align-items:center; gap:0.5rem; font-weight:500; transition: background 0.2s; }
                .btn-secondary:hover { background:#f3f4f6; }
                @keyframes fadeInUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
                .animate-fade-in-up { animation: fadeInUp 0.4s ease-out forwards; }
            `}</style>
    </div>
  );
};

export default StudentAdmission;
