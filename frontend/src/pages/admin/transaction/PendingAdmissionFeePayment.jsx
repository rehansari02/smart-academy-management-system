import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchStudentById,
  resetStatus,
} from "../../../features/student/studentSlice";
import {
  collectFees,
  resetTransaction,
} from "../../../features/transaction/transactionSlice";
import { toast } from "react-toastify";
import { Save, ArrowLeft, Loader2 } from "lucide-react";
import axios from "axios";

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

const PendingAdmissionFeePayment = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { currentStudent: student, isLoading: studentLoading } = useSelector(
    (state) => state.students
  );
  const {
    isSuccess,
    message,
    isLoading: feeLoading,
  } = useSelector((state) => state.transaction);

  const { user } = useSelector((state) => state.auth);
  const submitLockRef = useRef(false);
  const paymentRequestKeyRef = useRef(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    amountPaid: "",
    paymentMode: "Cash",
    remarks: "",
    receiptNo: "Loading...",
    date: new Date().toISOString().split("T")[0],
    receiptBankOption: '',
    onlinePaymentType: 'UPI',
    onlineProviderOption: '',
    bankName: '',
    chequeNumber: '',
    chequeDate: new Date().toISOString().split("T")[0],
    transactionId: '',
    transactionDate: new Date().toISOString().split("T")[0],
    paymentProviderName: '',
    paymentDetails: '',
    upiId: ''
  });

  useEffect(() => {
    if (id) {
      dispatch(fetchStudentById(id));
    }
    return () => {
      dispatch(resetStatus());
      dispatch(resetTransaction());
    };
  }, [id, dispatch]);

  useEffect(() => {
    // Fetch Next Receipt No when student is loaded
    if (student) {
        const fetchReceiptNo = async () => {
            try {
                const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/transaction/fees/next-no`, {
                    params: { branchId: student.branchId },
                    withCredentials: true
                });
                setFormData(prev => ({ ...prev, receiptNo: data }));
            } catch (error) {
                console.error("Failed to fetch next receipt no", error);
                setFormData(prev => ({ ...prev, receiptNo: "Error" }));
            }
        };
        fetchReceiptNo();
    }
  }, [student]);

  useEffect(() => {
    if (student && student.course) {
      const defaultFee = student.course.admissionFees || "";
      Promise.resolve().then(() => {
        setFormData((prev) => ({ ...prev, amountPaid: defaultFee }));
      });
    }
  }, [student]);

  useEffect(() => {
    if (isSuccess) {
      toast.success(message);
      setTimeout(() => {
        navigate("/transaction/pending-registration");
      }, 1500);
    }
  }, [isSuccess, message, navigate]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (submitLockRef.current || feeLoading || isSubmitting) return;

    if (!formData.amountPaid || formData.amountPaid <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    // Validation: Amount Check against Total Course Fee
    if (student?.course) {
       const maxFee = student.totalFees || student.course.courseFees || 0;
       if (Number(formData.amountPaid) > maxFee) {
          toast.error(`Amount cannot exceed the Total Course Fee (₹${maxFee})`);
          return;
       }
    }

    // Cheque validation
    if (formData.paymentMode === 'Cheque') {
        if (!formData.bankName?.trim() || !formData.chequeNumber?.trim() || !formData.chequeDate) {
            toast.error('Please enter cheque bank, cheque number, and cheque date');
            return;
        }
    }

    // Online/UPI validation
    if (formData.paymentMode === 'Online/UPI') {
        if (!formData.transactionId?.trim() || !formData.transactionDate) {
            toast.error('Please enter transaction number and transaction date');
            return;
        }
        if (formData.onlinePaymentType === 'UPI') {
            if (!formData.paymentProviderName?.trim()) {
                toast.error('Please select UPI app/provider');
                return;
            }
            if (!formData.upiId?.trim()) {
                toast.error('Please enter UPI ID / number');
                return;
            }
        } else if (formData.onlinePaymentType === 'Other') {
            if (!formData.paymentProviderName?.trim()) {
                toast.error('Please enter online payment name/provider');
                return;
            }
        } else if (!formData.bankName?.trim()) {
            toast.error('Please select or enter bank name');
            return;
        }
    }

    if (!paymentRequestKeyRef.current) {
      paymentRequestKeyRef.current = `${id}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }

    const feeData = {
      studentId: student._id,
      courseId: student.course._id,
      amountPaid: formData.amountPaid,
      paymentMode: formData.paymentMode,
      remarks: formData.remarks || 'Admission Fee',
      // Cheque fields
      bankName: formData.bankName,
      chequeNumber: formData.chequeNumber,
      chequeDate: formData.chequeDate,
      // Online/UPI fields
      transactionId: formData.transactionId,
      transactionDate: formData.transactionDate,
      onlinePaymentType: formData.onlinePaymentType,
      paymentProviderName: formData.paymentProviderName,
      paymentDetails: formData.onlinePaymentType === 'UPI' ? formData.upiId : formData.paymentDetails,
      date: formData.date,
      idempotencyKey: paymentRequestKeyRef.current,
    };

    submitLockRef.current = true;
    setIsSubmitting(true);

    dispatch(collectFees(feeData))
      .unwrap()
      .catch((error) => {
        submitLockRef.current = false;
        setIsSubmitting(false);
        paymentRequestKeyRef.current = null;
        toast.error(error || "Failed to save receipt");
      });
  };

  if (studentLoading || !student) {
    return <div className="p-6 text-center">Loading student details...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <button
        onClick={() => navigate(-1)}
        className="mb-4 flex items-center text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft size={16} className="mr-1" /> Back to List
      </button>

      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="bg-blue-600 text-white px-6 py-4">
          <h2 className="text-xl font-bold">Pending Admission Fee Payment</h2>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="border-r border-gray-100 pr-4">
            <div className="flex flex-col items-center mb-6 border-b pb-4">
                {student.studentPhoto ? (
                    <div className="p-1 bg-white border rounded-lg shadow-sm mb-3">
                        <img
                            src={student.studentPhoto.startsWith('http') ? student.studentPhoto : `${import.meta.env.VITE_API_URL}/${student.studentPhoto}`}
                            alt="Student"
                            className="w-32 h-32 rounded-lg object-cover object-top bg-gray-50"
                        />
                    </div>
                ) : (
                    <div className="w-32 h-32 bg-gray-100 rounded-lg flex items-center justify-center mb-3 text-gray-400">
                        No Photo
                    </div>
                )}
            </div>

            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-3">
                <span className="text-gray-500">Student Name:</span>
                <span className="col-span-2 font-medium">
                  {student.firstName} {student.lastName}
                </span>
              </div>
              <div className="grid grid-cols-3">
                <span className="text-gray-500">Father Name:</span>
                <span className="col-span-2 font-medium">
                  {student.middleName || "-"}
                </span>
              </div>
              <div className="grid grid-cols-3">
                <span className="text-gray-500">Mobile Number:</span>
                <span className="col-span-2 font-medium">
                  {student.mobileStudent || student.mobileParent}
                </span>
              </div>
              <div className="grid grid-cols-3">
                <span className="text-gray-500">E-mail ID:</span>
                <span className="col-span-2 font-medium">
                  {student.email || "-"}
                </span>
              </div>
              <div className="grid grid-cols-3">
                <span className="text-gray-500">Admission Date:</span>
                <span className="col-span-2 font-medium">
                  {new Date(student.admissionDate).toLocaleDateString()}
                </span>
              </div>
              <div className="grid grid-cols-3">
                <span className="text-gray-500">Date of Birth:</span>
                <span className="col-span-2 font-medium">
                  {new Date(student.dob).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-700 mb-4 border-b pb-2">
              Fee Payment
            </h3>

            <form onSubmit={handleSubmit} className={`space-y-4 ${isSubmitting ? 'pointer-events-none opacity-75' : ''}`}>
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Receipt Number
                </label>
                <div className="flex gap-2">
                    <input
                      type="text"
                      disabled
                      value={formData.receiptNo}
                      className="w-full bg-gray-100 border rounded px-3 py-2 text-sm text-gray-500"
                    />
                    {user?.role === 'Super Admin' && (
                         <input 
                            type="text" 
                            disabled 
                            value={student.branchName || 'Main'} 
                            className="w-full bg-blue-50 border border-blue-200 text-blue-800 rounded px-3 py-2 text-sm font-semibold" 
                            title="Branch" 
                        />
                     )}
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Receipt Date
                </label>
                <input
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) =>
                    setFormData({ ...formData, date: e.target.value })
                  }
                  className="w-full border rounded px-3 py-2 focus:ring focus:ring-blue-200"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Course Name
                </label>
                <input
                  type="text"
                  disabled
                  value={student.course?.name || ""}
                  className="w-full bg-gray-100 border rounded px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Amount (₹)
                </label>
                <input
                  type="text"
                  required
                  placeholder="Admission Fees"
                  value={formData.amountPaid}
                  onChange={(e) => {
                    const val = e.target.value;
                    // CHANGED: Allow up to Total Course Fee (User Request)
                    const maxFee = student.totalFees || student.course?.courseFees || 0;

                    if (val === "") {
                      setFormData({ ...formData, amountPaid: "" });
                      return;
                    }

                    if (!isNaN(val)) {
                      const numVal = Number(val);
                      if (numVal < 0) {
                        // Ignore negative input
                        return;
                      } else if (numVal > maxFee) {
                        toast.error(`Amount cannot exceed the Total Course Fee (₹${maxFee})`);
                        setFormData({ ...formData, amountPaid: maxFee.toString() });
                      } else {
                        setFormData({ ...formData, amountPaid: val });
                      }
                    }                  }}
                  className="w-full border rounded px-3 py-2 focus:ring focus:ring-blue-200 font-bold text-gray-800"
                />
                <span className="text-xs text-gray-400">
                  Default: Admission Fee
                </span>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Payment Mode
                </label>
                <select
                  className="w-full border rounded px-3 py-2 focus:ring focus:ring-blue-200"
                  value={formData.paymentMode}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      paymentMode: e.target.value,
                      receiptBankOption: '',
                      onlineProviderOption: '',
                      bankName: '',
                      chequeNumber: '',
                      transactionId: '',
                      paymentProviderName: '',
                      paymentDetails: '',
                      upiId: ''
                    })
                  }
                >
                  <option value="Cash">Cash</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Online/UPI">Online/UPI</option>
                </select>
              </div>

              {/* Dynamic Payment Fields - Cheque */}
              {formData.paymentMode === 'Cheque' && (
                <>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name *</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {POPULAR_INDIAN_BANKS.map((bank) => (
                        <label key={bank} className="flex items-center gap-2 border rounded p-2 text-sm cursor-pointer hover:bg-blue-50">
                          <input
                            type="radio"
                            name="admissionReceiptBank"
                            value={bank}
                            checked={formData.receiptBankOption === bank}
                            onChange={() => setFormData({
                              ...formData,
                              receiptBankOption: bank,
                              bankName: bank === 'Other' ? '' : bank
                            })}
                          />
                          {bank}
                        </label>
                      ))}
                    </div>
                  </div>
                  {formData.receiptBankOption === 'Other' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Other Bank Name *</label>
                      <input
                        type="text"
                        value={formData.bankName}
                        onChange={(e) => setFormData({...formData, bankName: e.target.value})}
                        className="w-full border rounded px-3 py-2 focus:ring focus:ring-blue-200"
                        placeholder="Enter bank name"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Cheque Number *</label>
                    <input
                      type="text"
                      value={formData.chequeNumber}
                      onChange={(e) => setFormData({...formData, chequeNumber: e.target.value})}
                      className="w-full border rounded px-3 py-2 focus:ring focus:ring-blue-200"
                      placeholder="Cheque No"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Cheque Date *</label>
                    <input
                      type="date"
                      value={formData.chequeDate}
                      onChange={(e) => setFormData({...formData, chequeDate: e.target.value})}
                      className="w-full border rounded px-3 py-2 focus:ring focus:ring-blue-200"
                    />
                  </div>
                </>
              )}

              {/* Dynamic Payment Fields - Online/UPI */}
              {formData.paymentMode === 'Online/UPI' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Payment Type *</label>
                    <select
                      value={formData.onlinePaymentType}
                      onChange={(e) => setFormData({
                        ...formData,
                        onlinePaymentType: e.target.value,
                        receiptBankOption: '',
                        onlineProviderOption: '',
                        bankName: '',
                        paymentProviderName: '',
                        paymentDetails: '',
                        upiId: ''
                      })}
                      className="w-full border rounded px-3 py-2 focus:ring focus:ring-blue-200"
                    >
                      {ONLINE_PAYMENT_TYPES.map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>

                  {formData.onlinePaymentType === 'UPI' ? (
                    <>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">UPI App / Provider *</label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {UPI_PROVIDERS.map((provider) => (
                            <label key={provider} className="flex items-center gap-2 border rounded p-2 text-sm cursor-pointer hover:bg-blue-50">
                              <input
                                type="radio"
                                name="admissionUpiProvider"
                                value={provider}
                                checked={formData.onlineProviderOption === provider}
                                onChange={() => setFormData({
                                  ...formData,
                                  onlineProviderOption: provider,
                                  paymentProviderName: provider === 'Other' ? '' : provider
                                })}
                              />
                              {provider}
                            </label>
                          ))}
                        </div>
                      </div>
                      {formData.onlineProviderOption === 'Other' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Provider Name *</label>
                          <input
                            type="text"
                            value={formData.paymentProviderName}
                            onChange={(e) => setFormData({...formData, paymentProviderName: e.target.value})}
                            className="w-full border rounded px-3 py-2 focus:ring focus:ring-blue-200"
                            placeholder="Enter provider name"
                          />
                        </div>
                      )}
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">UPI ID / Number *</label>
                        <input
                          type="text"
                          value={formData.upiId}
                          onChange={(e) => setFormData({...formData, upiId: e.target.value})}
                          className="w-full border rounded px-3 py-2 focus:ring focus:ring-blue-200"
                          placeholder="UPI ID / mobile number"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      {formData.onlinePaymentType === 'Other' ? (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Payment Name / Provider *</label>
                          <input
                            type="text"
                            value={formData.paymentProviderName}
                            onChange={(e) => setFormData({...formData, paymentProviderName: e.target.value})}
                            className="w-full border rounded px-3 py-2 focus:ring focus:ring-blue-200"
                            placeholder="Enter provider name"
                          />
                        </div>
                      ) : (
                        <>
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name *</label>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                              {POPULAR_INDIAN_BANKS.map((bank) => (
                                <label key={bank} className="flex items-center gap-2 border rounded p-2 text-sm cursor-pointer hover:bg-blue-50">
                                  <input
                                    type="radio"
                                    name="admissionOnlineBank"
                                    value={bank}
                                    checked={formData.receiptBankOption === bank}
                                    onChange={() => setFormData({
                                      ...formData,
                                      receiptBankOption: bank,
                                      bankName: bank === 'Other' ? '' : bank
                                    })}
                                  />
                                  {bank}
                                </label>
                              ))}
                            </div>
                          </div>
                          {formData.receiptBankOption === 'Other' && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Other Bank Name *</label>
                              <input
                                type="text"
                                value={formData.bankName}
                                onChange={(e) => setFormData({...formData, bankName: e.target.value})}
                                className="w-full border rounded px-3 py-2 focus:ring focus:ring-blue-200"
                                placeholder="Enter bank name"
                              />
                            </div>
                          )}
                        </>
                      )}
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Payment Details</label>
                        <input
                          type="text"
                          value={formData.paymentDetails}
                          onChange={(e) => setFormData({...formData, paymentDetails: e.target.value})}
                          className="w-full border rounded px-3 py-2 focus:ring focus:ring-blue-200"
                          placeholder="Account last 4 digits, note, or extra details"
                        />
                      </div>
                    </>
                  )}
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Transaction Number *</label>
                    <input
                      type="text"
                      value={formData.transactionId}
                      onChange={(e) => setFormData({...formData, transactionId: e.target.value})}
                      className="w-full border rounded px-3 py-2 focus:ring focus:ring-blue-200"
                      placeholder="UTR / Ref No / Transaction ID"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Transaction Date *</label>
                    <input
                      type="date"
                      value={formData.transactionDate}
                      onChange={(e) => setFormData({...formData, transactionDate: e.target.value})}
                      className="w-full border rounded px-3 py-2 focus:ring focus:ring-blue-200"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Remarks
                </label>
                <textarea
                  rows="2"
                  value={formData.remarks}
                  onChange={(e) =>
                    setFormData({ ...formData, remarks: e.target.value })
                  }
                  className="w-full border rounded px-3 py-2 focus:ring focus:ring-blue-200"
                  placeholder="Optional"
                ></textarea>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="submit"
                  disabled={feeLoading || isSubmitting}
                  className="w-full bg-green-600 text-white py-2 rounded shadow hover:bg-green-700 disabled:bg-green-300 disabled:cursor-not-allowed flex justify-center items-center gap-2 font-bold"
                >
                  {feeLoading || isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                  {feeLoading || isSubmitting ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PendingAdmissionFeePayment;
