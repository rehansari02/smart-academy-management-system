import React, { useState } from 'react';
import axios from 'axios';
import moment from 'moment';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  FileText,
  AlertCircle,
  Calendar,
  Hash,
  BookOpen,
  Award,
  CheckCircle,
  Clock,
  XCircle,
} from 'lucide-react';

const API = `${import.meta.env.VITE_API_URL}/master/exam-result/verify`;

const PublicResultView = () => {
  const [form, setForm] = useState({ identifier: '', dob: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setData(null);

    try {
      const payload = {
        identifier: form.identifier.trim(),
        dob: form.dob,
      };
      const { data: response } = await axios.post(API, payload);
      setData(response);
    } catch (err) {
      setError(err.response?.data?.message || 'Verification failed. Please check your details.');
    } finally {
      setLoading(false);
    }
  };

  const fullName = (student) =>
    [student?.firstName, student?.middleName, student?.lastName].filter(Boolean).join(' ') || '-';

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return moment(dateStr).format('DD MMM YYYY');
  };

  return (
    <div className="min-h-screen bg-gradient-to-tr from-gray-50 via-slate-50 to-blue-50/50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto text-center mb-10">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-blue-50 text-blue-600 border border-blue-100 uppercase tracking-widest mb-4">
            <Award size={14} className="animate-pulse" /> Result Corner
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-gray-900 tracking-tight mb-3">
            Check <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-indigo-600">Exam Result</span>
          </h1>
          <p className="max-w-xl mx-auto text-gray-500 text-sm sm:text-base leading-relaxed">
            Enter your Enrollment or Registration Number and Date of Birth to view your official result.
          </p>
        </motion.div>
      </div>

      <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <motion.div
          className="lg:col-span-5 bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-6 sm:p-8"
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Verify Result Credentials</h2>
            <p className="text-xs text-gray-400">Enter your Enrollment/Registration number and DOB.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                Enrollment / Registration Number
              </label>
              <div className="relative">
                <Hash size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  name="identifier"
                  value={form.identifier}
                  onChange={handleChange}
                  placeholder="e.g. 1456-BHE"
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-semibold uppercase placeholder:normal-case placeholder:font-normal"
                />
              </div>
            </div>

            <div className="border-t border-gray-100 pt-3">
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                Date of Birth <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Calendar size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="date"
                  name="dob"
                  required
                  value={form.dob}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-semibold"
                />
              </div>
            </div>

            {error && (
              <motion.div
                className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-medium"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-blue-900 hover:bg-blue-800 text-white font-bold rounded-xl shadow-lg shadow-blue-900/20 hover:shadow-blue-900/30 transition-all disabled:opacity-60"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <Search size={18} />
                  <span>View Result</span>
                </>
              )}
            </button>
          </form>
        </motion.div>

        <div className="lg:col-span-7">
          <AnimatePresence mode="wait">
            {data ? (
              <motion.div
                key="result-card"
                className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 30 }}
                transition={{ duration: 0.5 }}
              >
                <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 px-6 py-6 text-white relative">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none" />
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold text-blue-200 uppercase tracking-widest mb-1">Student Record Found</p>
                      <h3 className="text-xl sm:text-2xl font-black truncate">{fullName(data.student)}</h3>
                    </div>
                    <span className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-green-500/20 text-green-200 border border-green-500/30">
                      <CheckCircle size={12} /> Verified
                    </span>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-center">
                      <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Enrollment No</span>
                      <span className="text-xs font-bold text-gray-700 font-mono">{data.student.enrollmentNo || 'N/A'}</span>
                    </div>
                    <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-center">
                      <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Reg No</span>
                      <span className="text-xs font-bold text-gray-700 font-mono">{data.student.regNo || 'N/A'}</span>
                    </div>
                    <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-center">
                      <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Result Count</span>
                      <span className="text-xs font-bold text-gray-700">{data.results?.length || 0}</span>
                    </div>
                    <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-center">
                      <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Status</span>
                      <span className="text-xs font-bold text-green-600">Available</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2">Academic Results</h4>
                    {data.results?.map((res, idx) => (
                      <div key={idx} className="border border-gray-100 rounded-2xl overflow-hidden">
                        <div className="p-4 border-b border-gray-50 bg-gray-50/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div>
                            <h5 className="font-bold text-gray-800">{res.examName}</h5>
                            <p className="text-xs text-gray-500">{res.courseName}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full border border-blue-100">
                              <Award size={12} /> {res.grade || '-'}
                            </span>
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full border border-emerald-100">
                              <Clock size={12} /> {moment(res.issueDate).format('DD MMM YYYY')}
                            </span>
                          </div>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-[10px] font-bold text-gray-500 uppercase">
                              <tr>
                                <th className="px-4 py-3">Subject</th>
                                <th className="px-4 py-3 text-center">Theory</th>
                                <th className="px-4 py-3 text-center">Practical</th>
                                <th className="px-4 py-3 text-center">Total</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {res.subjects?.map((sub, sIdx) => (
                                <tr key={sIdx} className="hover:bg-gray-50/50 transition-colors">
                                  <td className="px-4 py-3 font-medium text-gray-700">{sub.name}</td>
                                  <td className="px-4 py-3 text-center text-gray-600">{sub.theory}</td>
                                  <td className="px-4 py-3 text-center text-gray-600">{sub.practical}</td>
                                  <td className="px-4 py-3 text-center font-bold text-blue-600">{sub.total}</td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot className="bg-blue-50/50 font-bold">
                              <tr>
                                <td className="px-4 py-3 text-gray-700">GRAND TOTAL</td>
                                <td colSpan={2}></td>
                                <td className="px-4 py-3 text-center text-blue-700 text-lg">
                                  {res.marksObtained} / {res.totalMarks}
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="placeholder-card"
                className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-8 text-center py-20 flex flex-col items-center justify-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center text-blue-900 mb-4 border border-blue-100">
                  <FileText size={28} className="animate-pulse" />
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-1">Awaiting Verification</h3>
                <p className="text-sm text-gray-400 max-w-sm">
                  Fill in the details on the left to verify and view the exam result.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default PublicResultView;
