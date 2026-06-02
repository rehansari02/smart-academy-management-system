import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Mail, Phone, MapPin, Trash2, Eye, X, Calendar, Clock, MessageSquare } from 'lucide-react';
import { toast } from 'react-toastify';
import { useUserRights } from '../../../hooks/useUserRights';
import { showPermissionDenied } from '../../../utils/permissionAlert';
const API_URL = import.meta.env.VITE_API_URL;

const ManageContact = () => {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedContact, setSelectedContact] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const { delete: canDelete } = useUserRights('Manage Contacts');
  // Initialize with today's date so it auto-shows today's records
  const getTodayStr = () => new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(getTodayStr);
  const [endDate, setEndDate] = useState(getTodayStr);

  const fetchContacts = async (pageNumber = 1, start = startDate, end = endDate) => {
    try {
      setLoading(true);
      let url = `${API_URL}/contact?page=${pageNumber}&pageSize=10`;
      if (start) url += `&startDate=${start}`;
      if (end) url += `&endDate=${end}`;
      const res = await axios.get(url, {
        withCredentials: true
      });
      setContacts(res.data.contacts);
      setTotalPages(res.data.pages);
      setPage(res.data.page);
    } catch (error) {
      console.error('Error fetching contacts:', error);
      toast.error('Failed to fetch contact submissions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts(page);
  }, [page]);

  const handleDateFilter = () => {
    setPage(1);
    fetchContacts(1);
  };

  const handleClearFilter = () => {
    setStartDate('');
    setEndDate('');
    setPage(1);
    fetchContacts(1, '', '');
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await axios.put(`${API_URL}/contact/${id}`, { status: newStatus }, {
        withCredentials: true
      });
      toast.success(`Status updated to ${newStatus}`);
      fetchContacts(page);
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async (id) => {
    if (!canDelete) {
      showPermissionDenied("You don't have authority to delete contacts.");
      return;
    }
    if (window.confirm('Are you sure you want to delete this message?')) {
      try {
        await axios.delete(`${API_URL}/contact/${id}`, {
          withCredentials: true
        });
        toast.success('Message deleted successfully');
        fetchContacts(page);
      } catch (error) {
        console.error('Error deleting contact:', error);
        toast.error('Failed to delete message');
      }
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Contact Submissions</h1>
      </div>

      {/* Date Filter */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6 flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">From Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">To Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>
        <button
          onClick={handleDateFilter}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          Filter
        </button>          <button
            onClick={handleClearFilter}
            className="px-4 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-300 transition-colors"
          >
            Show All
          </button>
      </div>

      {loading ? (
        <div className="text-center py-10">Loading...</div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name / Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject / Message</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {contacts.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center text-gray-500">No submissions found</td>
                </tr>
              ) : (
                contacts.map((contact) => (
                  <tr key={contact._id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(contact.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{contact.name}</div>
                      <div className="text-sm text-gray-500 flex items-center gap-1"><Mail size={14}/> {contact.email}</div>
                      {contact.phone && <div className="text-sm text-gray-500 flex items-center gap-1"><Phone size={14}/> {contact.phone}</div>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 flex items-center gap-1"><MapPin size={14}/> {contact.city}, {contact.state}</div>
                      <div className="text-sm text-gray-500">Branch: {contact.branch}</div>
                    </td>
                    <td className="px-6 py-4 max-w-xs">
                      <div className="text-sm font-medium text-gray-900 truncate">{contact.subject}</div>
                      <div className="text-sm text-gray-500 line-clamp-2">{contact.message}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={contact.status}
                        onChange={(e) => handleStatusChange(contact._id, e.target.value)}
                        className={`text-sm rounded-full px-3 py-1 border-none focus:ring-2 focus:ring-blue-500 font-semibold
                          ${contact.status === 'New' ? 'bg-red-100 text-red-800' : 
                            contact.status === 'Read' ? 'bg-yellow-100 text-yellow-800' : 
                            'bg-green-100 text-green-800'}`}
                      >
                        <option value="New">New</option>
                        <option value="Read">Read</option>
                        <option value="Resolved">Resolved</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button 
                        onClick={() => {
                          setSelectedContact(contact);
                          setShowViewModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                        title="View Details"
                      >
                        <Eye size={18} />
                      </button>
                      <button 
                        onClick={() => handleDelete(contact._id)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page === totalPages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing page <span className="font-medium">{page}</span> of <span className="font-medium">{totalPages}</span>
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    <button
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:bg-gray-100"
                    >
                      Previous
                    </button>
                    {[...Array(totalPages)].map((_, i) => (
                      <button
                        key={i + 1}
                        onClick={() => setPage(i + 1)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium
                          ${page === i + 1 
                            ? 'z-10 bg-blue-50 border-blue-500 text-blue-600' 
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'}`}
                      >
                        {i + 1}
                      </button>
                    ))}
                    <button
                      onClick={() => setPage(page + 1)}
                      disabled={page === totalPages}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:bg-gray-100"
                    >
                      Next
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* View Contact Modal */}
      {showViewModal && selectedContact && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 z-40 transition-opacity"
            onClick={() => setShowViewModal(false)}
          ></div>
          
          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <MessageSquare size={20} className="text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Contact Details</h3>
                    <span className={`inline-block text-xs font-semibold rounded-full px-3 py-0.5 mt-1
                      ${selectedContact.status === 'New' ? 'bg-red-100 text-red-800' : 
                        selectedContact.status === 'Read' ? 'bg-yellow-100 text-yellow-800' : 
                        'bg-green-100 text-green-800'}`}
                    >
                      {selectedContact.status}
                    </span>
                  </div>
                </div>
                <button 
                  onClick={() => setShowViewModal(false)}
                  className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-5">
                {/* Date */}
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Calendar size={16} />
                  <span>Submitted on {new Date(selectedContact.createdAt).toLocaleDateString('en-US', { 
                    year: 'numeric', month: 'long', day: 'numeric', 
                    hour: '2-digit', minute: '2-digit' 
                  })}</span>
                </div>

                {/* Personal Info */}
                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                  <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Personal Information</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-400">Name</label>
                      <p className="text-sm font-medium text-gray-900">{selectedContact.name}</p>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400">Email</label>
                      <p className="text-sm font-medium text-gray-900 break-all">{selectedContact.email}</p>
                    </div>
                    {selectedContact.phone && (
                      <div>
                        <label className="block text-xs text-gray-400">Phone</label>
                        <p className="text-sm font-medium text-gray-900">{selectedContact.phone}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Location Info */}
                {(selectedContact.state || selectedContact.city || selectedContact.branch) && (
                  <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                    <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Location</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {selectedContact.state && (
                        <div>
                          <label className="block text-xs text-gray-400">State</label>
                          <p className="text-sm font-medium text-gray-900">{selectedContact.state}</p>
                        </div>
                      )}
                      {selectedContact.city && (
                        <div>
                          <label className="block text-xs text-gray-400">City</label>
                          <p className="text-sm font-medium text-gray-900">{selectedContact.city}</p>
                        </div>
                      )}
                      {selectedContact.branch && (
                        <div>
                          <label className="block text-xs text-gray-400">Branch</label>
                          <p className="text-sm font-medium text-gray-900">{selectedContact.branch}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Subject & Message */}
                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                  <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Message</h4>
                  <div>
                    <label className="block text-xs text-gray-400">Subject</label>
                    <p className="text-sm font-medium text-gray-900">{selectedContact.subject}</p>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400">Message</label>
                    <p className="text-sm text-gray-700 bg-white rounded-lg p-3 border border-gray-200 whitespace-pre-wrap leading-relaxed">{selectedContact.message}</p>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-3 p-6 border-t border-gray-100">
                <button
                  onClick={() => setShowViewModal(false)}
                  className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ManageContact;
