import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { AlertTriangle, Edit3, MapPin, Phone, Plus, Search, Trash2, UserRound, X } from 'lucide-react';
import {
  createReference,
  deleteReference,
  fetchReferences,
  resetMasterStatus,
  updateReference
} from '../../../features/master/masterSlice';
import { useUserRights } from '../../../hooks/useUserRights';
import { showPermissionDenied } from '../../../utils/permissionAlert';

const emptyForm = {
  name: '',
  mobile: '',
  address: ''
};

const ExternalReference = () => {
  const dispatch = useDispatch();
  const { references = [], isLoading, isSuccess, message } = useSelector((state) => state.master);
  const { view, add, edit, delete: canDelete } = useUserRights('External Reference');
  const [formData, setFormData] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [referenceToDelete, setReferenceToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    dispatch(fetchReferences());
  }, [dispatch]);

  useEffect(() => {
    if (isSuccess && message) {
      toast.success(message);
      dispatch(resetMasterStatus());
    }
  }, [dispatch, isSuccess, message]);

  const filteredReferences = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return references;

    return references.filter((ref) =>
      ref.name?.toLowerCase().includes(term) ||
      ref.mobile?.toLowerCase().includes(term) ||
      ref.address?.toLowerCase().includes(term)
    );
  }, [references, searchTerm]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData(emptyForm);
    setEditingId(null);
  };

  const validateForm = () => {
    const name = formData.name.trim();
    const mobile = formData.mobile.trim();

    if (!name) {
      toast.error('Reference name is required');
      return false;
    }

    if (!/^[0-9+\-\s()]{7,15}$/.test(mobile)) {
      toast.error('Enter a valid mobile number');
      return false;
    }

    return true;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (editingId && !edit) {
      showPermissionDenied("You don't have authority to edit external references.");
      return;
    }

    if (!editingId && !add) {
      showPermissionDenied("You don't have authority to add external references.");
      return;
    }

    if (!validateForm()) return;

    const payload = {
      name: formData.name.trim(),
      mobile: formData.mobile.trim(),
      address: formData.address.trim()
    };

    try {
      setSubmitting(true);
      if (editingId) {
        await dispatch(updateReference({ id: editingId, data: payload })).unwrap();
      } else {
        await dispatch(createReference(payload)).unwrap();
      }
      resetForm();
    } catch (error) {
      toast.error(error || 'Failed to save reference');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (reference) => {
    if (!edit) {
      showPermissionDenied("You don't have authority to edit external references.");
      return;
    }

    setEditingId(reference._id);
    setFormData({
      name: reference.name || '',
      mobile: reference.mobile || '',
      address: reference.address || ''
    });
  };

  const handleDelete = (reference) => {
    if (!canDelete) {
      showPermissionDenied("You don't have authority to delete external references.");
      return;
    }

    setReferenceToDelete(reference);
  };

  const confirmDelete = async () => {
    if (!referenceToDelete) return;

    try {
      setDeleting(true);
      await dispatch(deleteReference(referenceToDelete._id)).unwrap();
      setReferenceToDelete(null);
    } catch (error) {
      toast.error(error || 'Failed to delete reference');
    } finally {
      setDeleting(false);
    }
  };

  if (!view) {
    return (
      <div className="p-8">
        <div className="rounded-lg border border-red-100 bg-red-50 p-6 text-center">
          <h1 className="text-xl font-bold text-red-700">Access denied</h1>
          <p className="mt-1 text-sm text-red-600">You do not have permission to view External Reference.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1500px] space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-blue-600">Utility</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">External Reference</h1>
          <p className="mt-1 text-sm font-medium text-slate-500">Manage outside reference contacts used in admissions, inquiries, and reports.</p>
        </div>
        <div className="grid grid-cols-3 gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
          <div className="px-3">
            <p className="text-[11px] font-black uppercase text-slate-400">Total</p>
            <p className="text-2xl font-black text-slate-900">{references.length}</p>
          </div>
          <div className="border-x border-slate-100 px-3">
            <p className="text-[11px] font-black uppercase text-slate-400">Visible</p>
            <p className="text-2xl font-black text-blue-700">{filteredReferences.length}</p>
          </div>
          <div className="px-3">
            <p className="text-[11px] font-black uppercase text-slate-400">Mode</p>
            <p className="text-sm font-black text-slate-900">{editingId ? 'Edit' : 'Add'}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
        <form onSubmit={handleSubmit} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-900">{editingId ? 'Edit Reference' : 'Add Reference'}</h2>
              <p className="text-xs font-semibold text-slate-500">Name and mobile are required.</p>
            </div>
            {editingId && (
              <button type="button" onClick={resetForm} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50" title="Cancel edit">
                <X size={18} />
              </button>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Reference Name</label>
              <div className="relative">
                <UserRound className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder="Enter reference name"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Mobile Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  name="mobile"
                  value={formData.mobile}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder="Enter mobile number"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Address</label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleChange}
                rows={4}
                className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                placeholder="Enter address"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-black text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            <Plus size={18} />
            {submitting ? 'Saving...' : editingId ? 'Update Reference' : 'Add Reference'}
          </button>
        </form>

        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-900">Reference List</h2>
              <p className="text-xs font-semibold text-slate-500">All active external references.</p>
            </div>
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-3 text-sm font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                placeholder="Search reference"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-5 py-3 text-left text-[11px] font-black uppercase tracking-widest text-slate-500">Reference</th>
                  <th className="px-5 py-3 text-left text-[11px] font-black uppercase tracking-widest text-slate-500">Mobile</th>
                  <th className="px-5 py-3 text-left text-[11px] font-black uppercase tracking-widest text-slate-500">Address</th>
                  <th className="px-5 py-3 text-right text-[11px] font-black uppercase tracking-widest text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {isLoading ? (
                  <tr>
                    <td colSpan="4" className="px-5 py-10 text-center text-sm font-bold text-slate-500">Loading references...</td>
                  </tr>
                ) : filteredReferences.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-5 py-10 text-center text-sm font-bold text-slate-500">No references found</td>
                  </tr>
                ) : (
                  filteredReferences.map((reference) => (
                    <tr key={reference._id} className="hover:bg-slate-50/70">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-700">
                            <UserRound size={19} />
                          </div>
                          <div>
                            <p className="text-sm font-black text-slate-900">{reference.name}</p>
                            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                              Added {reference.createdAt ? new Date(reference.createdAt).toLocaleDateString() : '-'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-1.5 text-sm font-bold text-emerald-700">
                          <Phone size={15} />
                          {reference.mobile}
                        </div>
                      </td>
                      <td className="max-w-md px-5 py-4">
                        <div className="flex items-start gap-2 text-sm font-semibold text-slate-600">
                          <MapPin className="mt-0.5 shrink-0 text-slate-400" size={16} />
                          <span className="line-clamp-2">{reference.address || 'Address not added'}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleEdit(reference)}
                            className="grid h-9 w-9 place-items-center rounded-lg border border-blue-100 bg-blue-50 text-blue-700 hover:bg-blue-100"
                            title="Edit reference"
                          >
                            <Edit3 size={17} />
                          </button>
                          <button
                            onClick={() => handleDelete(reference)}
                            className="grid h-9 w-9 place-items-center rounded-lg border border-red-100 bg-red-50 text-red-700 hover:bg-red-100"
                            title="Delete reference"
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {referenceToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 px-4">
          <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start gap-3 border-b border-slate-100 p-5">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-red-50 text-red-700">
                <AlertTriangle size={22} />
              </div>
              <div className="min-w-0">
                <h3 className="text-lg font-black text-slate-950">Delete External Reference?</h3>
                <p className="mt-1 text-sm font-medium leading-6 text-slate-600">
                  This will remove <span className="font-black text-slate-900">{referenceToDelete.name}</span> from active external references and reports.
                </p>
              </div>
            </div>
            <div className="flex flex-col-reverse gap-3 p-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setReferenceToDelete(null)}
                disabled={deleting}
                className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-black text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleting}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-black text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300"
              >
                <Trash2 size={17} />
                {deleting ? 'Deleting...' : 'Delete Reference'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExternalReference;
