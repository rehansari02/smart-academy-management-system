import React, { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  createCourse,
  fetchCourses,
  fetchSubjects,
  resetMasterStatus,
  updateCourse,
} from '../../../features/master/masterSlice';
import { toast } from 'react-toastify';
import { ArrowLeft, Clock, Edit2, Layers, Plus, Save, Upload, X } from 'lucide-react';
import { useUserRights } from '../../../hooks/useUserRights';
import { showPermissionDenied } from '../../../utils/permissionAlert';

const feeFields = ['courseFees', 'admissionFees', 'registrationFees', 'monthlyFees', 'totalInstallment'];

const CourseFormPage = () => {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { courses, subjects, isSuccess, isLoading } = useSelector((state) => state.master);
  const { add, edit } = useUserRights('Course');

  const [selectedSubjectMap, setSelectedSubjectMap] = useState({});
  const [previewImage, setPreviewImage] = useState(null);
  const [pendingPriceChange, setPendingPriceChange] = useState(null);
  const { register, handleSubmit, reset, setValue, control } = useForm({
    defaultValues: {
      commissionType: 'Percentage',
      durationType: 'Month',
      totalInstallment: 1,
      isActive: true,
    },
  });

  const commissionType = useWatch({ control, name: 'commissionType' }) || 'Percentage';
  const currentCourse = courses.find((course) => course._id === id);
  const uniqueCourseTypes = [...new Set(courses.map((course) => course.courseType))].filter(Boolean);

  useEffect(() => {
    dispatch(fetchSubjects());
    if (courses.length === 0) {
      dispatch(fetchCourses({}));
    }
  }, [dispatch, courses.length]);

  useEffect(() => {
    if (!isEditing || !currentCourse) return;

    const fields = [
      'name', 'shortName', 'courseFees', 'admissionFees', 'registrationFees',
      'monthlyFees', 'totalInstallment', 'sorting', 'commissionType', 'commission',
      'duration', 'durationType', 'courseType', 'image', 'smallDescription',
      'description', 'isActive',
    ];

    fields.forEach((field) => setValue(field, currentCourse[field]));
    setValue('commissionType', currentCourse.commissionType || 'Percentage');

    const subjectMap = {};
    currentCourse.subjects?.forEach((item) => {
      if (item.subject?._id) {
        subjectMap[item.subject._id] = item.sortOrder || 0;
      }
    });

    let shouldHydrate = true;
    queueMicrotask(() => {
      if (!shouldHydrate) return;
      setSelectedSubjectMap(subjectMap);
      setPreviewImage(currentCourse.image || null);
    });

    return () => {
      shouldHydrate = false;
    };
  }, [currentCourse, isEditing, setValue]);

  useEffect(() => {
    if (!isSuccess) return;

    toast.success(isEditing ? 'Course Updated' : 'Course Created');
    dispatch(resetMasterStatus());
    navigate('/master/course');
  }, [dispatch, isEditing, isSuccess, navigate]);

  const formatMoney = (value) => `Rs. ${Number(value || 0).toLocaleString('en-IN')}`;

  const getFeeSnapshot = (course = {}) => ({
    courseFees: Number(course.courseFees || 0),
    admissionFees: Number(course.admissionFees || 0),
    registrationFees: Number(course.registrationFees || 0),
    monthlyFees: Number(course.monthlyFees || 0),
    totalInstallment: Number(course.totalInstallment || 1),
  });

  const handleSubjectToggle = (subjectId) => {
    const nextMap = { ...selectedSubjectMap };
    if (nextMap[subjectId] !== undefined) {
      delete nextMap[subjectId];
    } else {
      nextMap[subjectId] = 0;
    }
    setSelectedSubjectMap(nextMap);
  };

  const handleSubjectSortChange = (subjectId, order) => {
    if (selectedSubjectMap[subjectId] === undefined) return;
    setSelectedSubjectMap({
      ...selectedSubjectMap,
      [subjectId]: parseInt(order, 10) || 0,
    });
  };

  const buildPayload = (data) => ({
    ...data,
    subjects: Object.keys(selectedSubjectMap).map((subjectId) => ({
      subject: subjectId,
      sortOrder: selectedSubjectMap[subjectId],
    })),
  });

  const onSubmit = (data) => {
    const payload = buildPayload(data);

    if (isEditing) {
      if (!edit) {
        showPermissionDenied("You don't have authority to edit courses.");
        return;
      }

      if (currentCourse) {
        const oldFees = getFeeSnapshot(currentCourse);
        const newFees = getFeeSnapshot(payload);
        const hasFeeChange = feeFields.some((field) => oldFees[field] !== newFees[field]);

        if (hasFeeChange) {
          setPendingPriceChange({
            id,
            payload,
            courseName: currentCourse.name,
            oldFees,
            newFees,
          });
          return;
        }
      }

      dispatch(updateCourse({ id, data: payload }));
      return;
    }

    if (!add) {
      showPermissionDenied("You don't have authority to add courses.");
      return;
    }
    dispatch(createCourse(payload));
  };

  const confirmPriceChange = () => {
    if (!pendingPriceChange) return;
    dispatch(updateCourse({ id: pendingPriceChange.id, data: pendingPriceChange.payload }));
    setPendingPriceChange(null);
  };

  return (
    <div className="container mx-auto p-4">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <Link to="/master/course" className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
            <ArrowLeft size={16} /> Back to Courses
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{isEditing ? 'Update Course' : 'Create New Course'}</h1>
        </div>
        <button
          type="button"
          onClick={handleSubmit(onSubmit)}
          disabled={isLoading}
          className={`inline-flex items-center justify-center gap-2 rounded bg-green-600 px-5 py-2.5 text-sm font-bold text-white shadow transition ${isLoading ? 'cursor-not-allowed opacity-70' : 'hover:bg-green-700'}`}
        >
          {isLoading ? <Clock className="animate-spin" size={16} /> : <Save size={16} />}
          {isLoading ? 'Saving...' : isEditing ? 'Update Course' : 'Save Course'}
        </button>
      </div>

      {isEditing && !currentCourse && isLoading ? (
        <div className="rounded-lg border bg-white p-8 text-center text-gray-500">Loading course details...</div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-bold uppercase text-gray-700">Basic Details</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="md:col-span-2">
                <label className="label">Course Name <span className="text-red-500">*</span></label>
                <input {...register('name', { required: true })} className="input-field" placeholder="e.g. Master in Computer Science" />
              </div>
              <div>
                <label className="label">Short Name <span className="text-red-500">*</span></label>
                <input {...register('shortName', { required: true })} className="input-field" placeholder="e.g. MCS" />
              </div>
              <div>
                <label className="label">Duration <span className="text-red-500">*</span></label>
                <input type="number" {...register('duration', { required: true })} className="input-field" placeholder="6" />
              </div>
              <div>
                <label className="label">Duration Type</label>
                <select {...register('durationType')} className="input-field">
                  {['Month', 'Year', 'Days'].map((type) => <option key={type} value={type}>{type}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Course Type</label>
                <input list="courseTypes" {...register('courseType', { required: true })} className="input-field" placeholder="Select or Type" />
                <datalist id="courseTypes">
                  {uniqueCourseTypes.map((type) => <option key={type} value={type} />)}
                </datalist>
              </div>
              <div>
                <label className="label">Sort Order</label>
                <input type="number" {...register('sorting')} className="input-field" placeholder="0" />
              </div>
              <div className="md:col-span-2">
                <label className="label">Small Description</label>
                <input {...register('smallDescription')} className="input-field" placeholder="Brief summary..." />
              </div>
              <div className="md:col-span-3">
                <label className="label">Full Description</label>
                <textarea {...register('description')} className="input-field h-28" placeholder="Detailed details..." />
              </div>
              <div className="md:col-span-3">
                <label className="flex cursor-pointer items-center gap-2">
                  <input type="checkbox" {...register('isActive')} className="h-4 w-4 rounded text-primary" />
                  <span className="text-sm font-bold text-gray-700">Course Is Active</span>
                </label>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-bold uppercase text-gray-700">Fees & Commission</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="label">Total Fees <span className="text-red-500">*</span></label>
                <input type="number" {...register('courseFees', { required: true })} className="input-field" placeholder="0" />
              </div>
              <div>
                <label className="label">Admission Fees</label>
                <input type="number" {...register('admissionFees')} className="input-field" placeholder="0" />
              </div>
              <div>
                <label className="label">Registration Fees</label>
                <input type="number" {...register('registrationFees')} className="input-field" placeholder="0" />
              </div>
              <div>
                <label className="label">Monthly Fees</label>
                <input type="number" {...register('monthlyFees')} className="input-field" placeholder="0" />
              </div>
              <div>
                <label className="label">Installments</label>
                <input type="number" {...register('totalInstallment')} className="input-field" placeholder="1" />
              </div>
              <div>
                <label className="label">Commission Type</label>
                <select {...register('commissionType')} className="input-field">
                  <option value="Percentage">Percentage</option>
                  <option value="Amount">Amount</option>
                </select>
              </div>
              <div>
                <label className="label">Commission {commissionType === 'Amount' ? '(Amount)' : '(%)'}</label>
                <input type="number" step="0.01" {...register('commission')} className="input-field" placeholder="0" />
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-bold uppercase text-gray-700">Course Image</h2>
            <label className="relative flex h-56 w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 transition hover:bg-gray-100">
              {previewImage ? (
                <img src={previewImage} alt="Preview" className="h-full w-full object-contain bg-white" />
              ) : (
                <div className="flex flex-col items-center justify-center px-4 text-center">
                  <Upload className="mb-2 h-8 w-8 text-gray-400" />
                  <p className="text-xs font-semibold text-gray-500">Click to upload image</p>
                </div>
              )}
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={(event) => {
                  const file = event.target.files[0];
                  if (file) {
                    setPreviewImage(URL.createObjectURL(file));
                    setValue('image', file);
                  }
                }}
              />
            </label>
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase text-gray-700">
              <Layers size={18} /> Subject Configuration
            </h2>
            <div className="max-h-[420px] overflow-y-auto rounded-lg border">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="sticky top-0 bg-gray-100">
                  <tr>
                    <th className="w-16 px-4 py-2 text-center text-xs font-bold uppercase text-gray-500">Select</th>
                    <th className="px-4 py-2 text-left text-xs font-bold uppercase text-gray-500">Subject Name</th>
                    <th className="w-36 px-4 py-2 text-left text-xs font-bold uppercase text-gray-500">Sort Order</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {subjects.map((subject) => {
                    const isSelected = selectedSubjectMap[subject._id] !== undefined;
                    return (
                      <tr key={subject._id} className={isSelected ? 'bg-blue-50' : ''}>
                        <td className="px-4 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleSubjectToggle(subject._id)}
                            className="h-4 w-4 cursor-pointer"
                          />
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-700">{subject.name}</td>
                        <td className="px-4 py-2">
                          {isSelected && (
                            <input
                              type="number"
                              value={selectedSubjectMap[subject._id]}
                              onChange={(event) => handleSubjectSortChange(subject._id, event.target.value)}
                              className="w-full rounded border p-1 text-center text-sm"
                            />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <div className="sticky bottom-0 z-10 flex justify-end gap-3 border-t bg-gray-50 p-4">
            <Link to="/master/course" className="rounded border px-4 py-2 text-sm font-medium hover:bg-gray-100">Cancel</Link>
            <button
              type="button"
              onClick={() => {
                reset();
                setSelectedSubjectMap({});
                setPreviewImage(null);
              }}
              className="rounded border border-orange-200 px-4 py-2 text-sm font-medium text-orange-600 hover:bg-orange-50"
            >
              Reset
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className={`rounded bg-green-600 px-6 py-2 text-sm font-bold text-white shadow transition ${isLoading ? 'cursor-not-allowed opacity-70' : 'hover:bg-green-700'}`}
            >
              {isEditing ? 'Update Course' : 'Save Course'}
            </button>
          </div>
        </form>
      )}

      {pendingPriceChange && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black bg-opacity-60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl overflow-hidden rounded-lg bg-white shadow-2xl">
            <div className="flex items-center justify-between bg-orange-600 p-4 text-white">
              <div>
                <h3 className="text-lg font-bold">Confirm Course Price Change</h3>
                <p className="text-xs text-white/80">{pendingPriceChange.courseName}</p>
              </div>
              <button onClick={() => setPendingPriceChange(null)} className="hover:text-red-200"><X size={22} /></button>
            </div>
            <div className="space-y-4 p-5">
              <p className="text-sm text-gray-700">
                Are you sure you want to change the course price? Old admissions will keep the previous fee and new admissions will use the updated fee.
              </p>
              <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
                <FeeSummary title="Old Fee" fees={pendingPriceChange.oldFees} formatMoney={formatMoney} />
                <FeeSummary title="New Fee" fees={pendingPriceChange.newFees} formatMoney={formatMoney} highlight />
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t bg-gray-50 p-4">
              <button onClick={() => setPendingPriceChange(null)} className="rounded border px-4 py-2 text-sm font-medium hover:bg-gray-100">
                Cancel
              </button>
              <button onClick={confirmPriceChange} className="rounded bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700">
                Yes, Change Price
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .label { display: block; font-size: 0.75rem; font-weight: 700; color: #374151; text-transform: uppercase; margin-bottom: 0.25rem; }
        .input-field { width: 100%; border: 1px solid #e5e7eb; padding: 0.5rem; border-radius: 0.375rem; font-size: 0.875rem; outline: none; transition: border-color 0.2s; }
        .input-field:focus { border-color: #2563eb; }
      `}</style>
    </div>
  );
};

const FeeSummary = ({ title, fees, formatMoney, highlight = false }) => (
  <div className={`rounded-lg border p-4 ${highlight ? 'bg-blue-50' : 'bg-gray-50'}`}>
    <div className={`mb-2 font-bold ${highlight ? 'text-blue-700' : 'text-gray-700'}`}>{title}</div>
    <div className="space-y-1 text-gray-700">
      <div>Total: {formatMoney(fees.courseFees)}</div>
      <div>Admission: {formatMoney(fees.admissionFees)}</div>
      <div>Registration: {formatMoney(fees.registrationFees)}</div>
      <div>Monthly: {formatMoney(fees.monthlyFees)}</div>
      <div>Installments: {fees.totalInstallment || 1}</div>
    </div>
  </div>
);

export default CourseFormPage;
