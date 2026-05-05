import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { fetchInquiries, createInquiry, updateInquiry, resetTransaction } from '../../../features/transaction/transactionSlice';
import { fetchCourses } from '../../../features/master/masterSlice';
import { fetchEmployees } from '../../../features/employee/employeeSlice';
import SmartTable from '../../../components/ui/SmartTable';
import InquiryForm from '../../../components/transaction/InquiryForm'; // Imported reusable form
import InquiryViewModal from '../../../components/transaction/InquiryViewModal';
import StudentSearch from '../../../components/StudentSearch';
import { 
    Plus, Search, RefreshCw, X, PhoneCall, User, Edit, Trash2, Eye, Calendar
} from 'lucide-react';
import { toast } from 'react-toastify';
import { formatDate } from '../../../utils/dateUtils';

// Follow Up Modal (Specific to Action Button)
const FollowUpModal = ({ inquiry, onClose, onSave }) => {
    const navigate = useNavigate();
    
    // Get current time in HH:MM format for default
    const getCurrentTime = () => {
        const now = new Date();
        return now.toTimeString().slice(0, 5); // Returns HH:MM
    };

    const [selectedStatus, setSelectedStatus] = useState(inquiry.status || 'Open');
    
    const { register, handleSubmit, watch } = useForm({ 
        defaultValues: { 
            status: inquiry.status || 'Open', 
            newRemarks: '',
            fDate: inquiry.followUpDate ? new Date(inquiry.followUpDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            fTime: inquiry.followUpDate ? new Date(inquiry.followUpDate).toTimeString().slice(0, 5) : getCurrentTime(),
        } 
    });

    // Watch status field for conditional rendering
    const statusValue = watch('status');
    useEffect(() => {
        setSelectedStatus(statusValue);
    }, [statusValue]);

    const onSubmit = async (data) => {
        // Construct full Date objects
        let fDate = null;
        if(data.fDate) {
             const time = data.fTime || '00:00';
             fDate = new Date(`${data.fDate}T${time}`);
        }

        const finalDetails = data.newRemarks ? (inquiry.followUpDetails ? `${inquiry.followUpDetails}\n[${formatDate(fDate)}]: ${data.newRemarks}` : `[${formatDate(fDate)}]: ${data.newRemarks}`) : inquiry.followUpDetails;

        const updateData = { 
            status: data.status,
            followUpDetails: finalDetails,
            followUpDate: fDate, 
        };

        // Save the inquiry update first
        await onSave({ id: inquiry._id, data: updateData });
        
        // If status is Complete, navigate to Student Admission with inquiry data
        if(data.status === 'Complete') {
            setTimeout(() => {
                navigate('/master/student/new', { 
                    state: { 
                        inquiryData: inquiry 
                    } 
                });
            }, 500); // Small delay to ensure the save completes
        } else {
            onClose();
        }
    };

    const showNextVisit = selectedStatus !== 'Close' && selectedStatus !== 'Complete';

    const { isLoading } = useSelector((state) => state.transaction);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-lg shadow-xl animate-fadeIn max-h-[90vh] overflow-y-auto flex flex-col">
                <div className="flex justify-between mb-4 border-b pb-2"><h3 className="font-bold text-blue-800">Follow Up Update</h3><button onClick={onClose}><X/></button></div>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    
                    {/* Inquiry Status */}
                     <div>
                        <label className="text-xs font-bold block mb-1">Inquiry Status</label>
                        <select {...register('status')} className="border p-2 rounded w-full text-sm">
                            <option value="Open">Open</option>
                            <option value="InProgress">InProgress</option>
                            <option value="Recall">Recall</option>
                            <option value="Close">Close</option>
                            <option value="Complete">Complete</option>
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div><label className="text-xs font-bold block mb-1">Follow-Up Date (dd-mm-yyyy)</label><input type="date" {...register('fDate')} required className="border p-2 rounded w-full text-sm"/></div>
                        <div><label className="text-xs font-bold block mb-1">Time (12h)</label><input type="time" {...register('fTime')} required className="border p-2 rounded w-full text-sm"/></div>
                    </div>
                    <div>
                        <label className="text-xs font-bold block mb-1">Previous Remarks</label>
                        <div className="border p-2 rounded w-full text-sm h-24 overflow-y-auto bg-gray-50 text-gray-700 font-mono whitespace-pre-wrap">
                            {inquiry.followUpDetails || 'No previous remarks'}
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-bold block mb-1 mt-2">New Discussion / Remarks</label>
                        <textarea {...register('newRemarks')} className="border p-2 rounded w-full text-sm" rows="2" placeholder="Enter new remarks..."></textarea>
                    </div>
                    
                    <button disabled={isLoading} className="bg-blue-600 text-white w-full py-2 rounded mt-2 hover:bg-blue-700 font-bold shadow-sm disabled:opacity-70 disabled:cursor-not-allowed">
                        {isLoading ? 'Saving...' : 'Update Status'}
                    </button>
                </form>
            </div>
        </div>
    );
};

const InquiryOffline = () => {
  const dispatch = useDispatch();
  const location = useLocation();
  const { inquiries, isSuccess, message } = useSelector((state) => state.transaction);
  const { employees } = useSelector((state) => state.employees);
  const { user } = useSelector((state) => state.auth);
  
  // Filter defaults to Walk-in for Offline page
  const [filters, setFilters] = useState({ startDate: '', endDate: new Date().toISOString().split('T')[0], status: '', studentName: '', referenceBy: '', source: 'Walk-in', dateFilterType: 'followUpDate' });
  const [modal, setModal] = useState({ type: null, data: null }); // type: 'form', 'followup', 'view'

  useEffect(() => { dispatch(fetchInquiries(filters)); dispatch(fetchCourses()); dispatch(fetchEmployees()); }, [dispatch]);
  
  // Check for conversion data from Visitors page
  useEffect(() => {
    if (location.state?.visitorData) {
        setModal({ type: 'form', data: { ...location.state.visitorData, isConversion: true } });
        window.history.replaceState({}, document.title);
    }
  }, [location]);

  useEffect(() => { 
      if (isSuccess && message) { 
          toast.success(message); 
          dispatch(resetTransaction()); 
          setModal({type:null});
          // fetchInquiries removed to prevent resetting list filters/showing all data
          // Redux state is already updated via create/update thunks
      } 
  }, [isSuccess, message, dispatch]);

  const handleSave = (data) => {
      // Data is now FormData if coming from InquiryForm, or object from FollowUpModal
      // If FormData, we pass it directly. Backend handles multipart.
      if(data instanceof FormData) {
          // Check for ID in FormData to decide create or update
          const id = data.get('_id');
          if(id) dispatch(updateInquiry({ id, data }));
          else dispatch(createInquiry(data));
      } else {
          // Normal JSON update (FollowUpModal)
          if(data._id) dispatch(updateInquiry({ id: data._id, data })); // Wrong structure in handleSave? 
          // Wait, FollowUpModal passes {id, data} wrapper to onSave, InquiryForm passes Payload or FormData.
          // Let's normalize inside the components or here.
          // InquiryForm calls onSave(formData). FollowUp call logic is below.
      }
  };
  
  // Wrapper for InquiryForm save
  const handleFormSave = (payload) => {
       if (payload instanceof FormData) {
           const id = payload.get('_id');
            if(id && id !== 'undefined') dispatch(updateInquiry({ id, data: payload }));
            else dispatch(createInquiry(payload));
       } else {
           // Fallback/Legacy
           if(payload._id) dispatch(updateInquiry({ id: payload._id, data: payload }));
           else dispatch(createInquiry(payload));
       }
  };


  const handleDelete = (id) => {
      if(window.confirm('Delete this inquiry?')) dispatch(updateInquiry({ id, data: { isDeleted: true } })).then(() => dispatch(fetchInquiries(filters)));
  };

  const columns = [
      { header: 'Sr', render: (_, i) => i + 1 },
      ...(user?.role === 'Super Admin' ? [{ header: 'Branch', render: r => r.branchId?.name || '-' }] : []),
      { header: 'Date', render: r => formatDate(r.inquiryDate) },
      { header: 'Student Name', render: r => <span className="font-bold text-gray-700">{r.firstName} {r.middleName ? r.middleName + ' ' : ''}{r.lastName || ''}</span> },
      { header: 'Contact (Home)', render: r => r.contactHome || '-' },
      { header: 'Contact (Student)', render: r => r.contactStudent || '-' },
      { header: 'Contact (Parent)', render: r => r.contactParent || '-' },
      { header: 'Gender', accessor: 'gender' },
      { header: 'Status', render: r => <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${r.status==='Open'?'bg-green-100 text-green-700': r.status==='Recall' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-600'}`}>{r.status}</span> },
      { header: 'Next Follow Up', render: r => (
          <div className="text-xs">
              <div className="font-bold text-blue-600">{r.nextVisitingDate ? formatDate(r.nextVisitingDate) : '-'}</div>
              <div className="text-gray-500 font-medium">
                  {r.nextVisitingDate && new Date(r.nextVisitingDate).toTimeString() !== '00:00:00 GMT+0530 (India Standard Time)' && new Date(r.nextVisitingDate).toTimeString() !== '00:00:00 GMT+0000 (Coordinated Universal Time)' ? new Date(r.nextVisitingDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
              </div>
          </div>
      )},
      { header: 'Action', render: r => (
          <div className="flex gap-2">
            <button onClick={() => setModal({type:'followup', data:r})} className="bg-purple-50 text-purple-600 border border-purple-200 p-1.5 rounded hover:bg-purple-100" title="Follow Up">
                <PhoneCall size={14}/>
            </button>
            <button onClick={() => setModal({type:'form', data:r})} className="bg-blue-50 text-blue-600 border border-blue-200 p-1.5 rounded hover:bg-blue-100" title="Edit">
                <Edit size={14}/>
            </button>
            <button onClick={() => handleDelete(r._id)} className="bg-red-50 text-red-600 border border-red-200 p-1.5 rounded hover:bg-red-100" title="Delete">
                <Trash2 size={14}/>
            </button>
          </div>
      )},
  ];

  return (
    <div className="container mx-auto p-4 max-w-full animate-fadeIn">
        <div className="flex justify-between mb-4 items-center">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><User className="text-blue-600"/> Offline Inquiries</h2>
            <button onClick={() => setModal({type:'form'})} className="bg-blue-600 text-white px-4 py-2 rounded shadow flex items-center gap-2 hover:bg-blue-700 font-bold transition-all transform hover:scale-105">
                <Plus size={18}/> Add Offline Inquiry
            </button>
        </div>
        
      {/* --- Filter Section --- */}
      <div className="bg-white p-4 rounded-lg shadow mb-6 border border-gray-200">
        <h2 className="text-sm font-bold text-gray-700 uppercase mb-3 flex items-center gap-2">
            <Search size={16}/> Search Offline Inquiries
        </h2>
        
        <div className="flex flex-col gap-4">
            {/* Row 1: Dates & Status */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                    <label className="text-xs text-gray-500 font-semibold mb-1 block">Date Type</label>
                    <select value={filters.dateFilterType} onChange={e => setFilters({...filters, dateFilterType: e.target.value})} className="w-full border p-2 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                        <option value="inquiryDate">Inquiry Date</option>
                        <option value="followUpDate">Follow-up Date</option>
                    </select>
                </div>
                <div>
                    <label className="text-xs text-gray-500 font-semibold mb-1 block">From Date</label>
                    <input type="date" value={filters.startDate} onChange={e => setFilters({...filters, startDate: e.target.value})} className="w-full border p-2 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"/>
                </div>
                <div>
                    <label className="text-xs text-gray-500 font-semibold mb-1 block">To Date</label>
                    <input type="date" value={filters.endDate} onChange={e => setFilters({...filters, endDate: e.target.value})} className="w-full border p-2 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"/>
                </div>
                <div>
                    <label className="text-xs text-gray-500 font-semibold mb-1 block">Status</label>
                    <select value={filters.status} onChange={e => setFilters({...filters, status: e.target.value})} className="w-full border p-2 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                        <option value="">All Status</option>
                        <option value="Open">Open</option>
                        <option value="InProgress">InProgress</option>
                        <option value="Recall">Recall</option>
                        <option value="Close">Close</option>
                        <option value="Complete">Complete</option>
                    </select>
                </div>
            </div>

            {/* Row 2: Student Search & Branch (if Super Admin) */}
            <div className={`grid grid-cols-1 ${user?.role === 'Super Admin' ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-4`}>
                <div className="relative z-20"> 
                    <StudentSearch 
                        label="Search Student"
                        mode="inquiry"
                        additionalFilters={{ source: 'Walk-in' }}
                        onSelect={(id, student) => {
                            if (student) {
                                setFilters({ ...filters, studentName: student.firstName });
                            } else {
                                setFilters({ ...filters, studentName: '' });
                            }
                        }}
                        placeholder="Search by Name for Offline Inquiries..."
                        className="w-full text-sm"
                    />
                </div>
                <div>
                    <label className="text-xs text-gray-500 font-semibold mb-1 block">Reference By</label>
                    <input type="text" value={filters.referenceBy} onChange={e => setFilters({...filters, referenceBy: e.target.value})} placeholder="Search Reference..." className="w-full border p-2.5 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"/>
                </div>
                {/* Add Branch Filter here if needed for Super Admin, currently implicitly handled by API/User role but visual filter could be added */}
            </div>

            {/* Row 3: Buttons */}
            <div className="grid grid-cols-2 gap-4 pt-2">
                <button 
                    onClick={() => {
                        const resetState = { startDate: '', endDate: new Date().toISOString().split('T')[0], status: '', studentName: '', referenceBy: '', source: 'Walk-in', dateFilterType: 'followUpDate' };
                        setFilters(resetState);
                        dispatch(fetchInquiries(resetState));
                    }} 
                    className="bg-red-100 text-red-700 px-6 py-2.5 rounded hover:bg-red-200 font-medium transition text-sm flex items-center justify-center gap-2"
                >
                    <RefreshCw size={16}/> Reset
                </button>
                <button 
                    onClick={() => dispatch(fetchInquiries(filters))} 
                    className="bg-blue-600 text-white px-6 py-2.5 rounded hover:bg-blue-700 font-medium transition text-sm flex items-center justify-center gap-2"
                >
                    <Search size={16}/> Search
                </button>
            </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto border">
        <table className="w-full border-collapse min-w-[1400px]">
            <thead>
                <tr className="bg-blue-600 text-white text-left text-xs uppercase tracking-wider">
                    <th className="p-2 border font-semibold w-12">Sr. No.</th>
                    <th className="p-2 border font-semibold">Inquiry Date</th>
                    {user?.role === 'Super Admin' && <th className="p-2 border font-semibold">Branch</th>}
                    <th className="p-2 border font-semibold">Student Name</th>
                    <th className="p-2 border font-semibold">Contact (Home)</th>
                    <th className="p-2 border font-semibold">Contact (Student)</th>
                    <th className="p-2 border font-semibold">Contact (Parent)</th>
                    <th className="p-2 border font-semibold">Gender</th>
                    <th className="p-2 border font-semibold text-center">Status</th>
                    <th className="p-2 border font-semibold">Followup Date</th>
                    <th className="p-2 border font-semibold">Followup Time</th>
                    <th className="p-2 border font-semibold">Followup Details</th>
                    {/* <th className="p-2 border font-semibold w-48">Allocation To</th> */}
                    <th className="p-2 border font-semibold text-center sticky right-0 bg-blue-600 z-10 w-32">Actions</th>
                </tr>
            </thead>
            <tbody>
                {inquiries && inquiries.length > 0 ? inquiries.map((inquiry, index) => (
                    <tr key={inquiry._id} className="hover:bg-blue-50 text-xs border-b border-gray-100 transition-colors">
                        <td className="p-2 border text-center">{index + 1}</td>
                        <td className="p-2 border text-gray-700">{formatDate(inquiry.inquiryDate)}</td>
                        {user?.role === 'Super Admin' && <td className="p-2 border text-gray-600">{inquiry.branchId?.name || '-'}</td>}
                        <td className="p-2 border font-bold text-gray-800">{inquiry.firstName} {inquiry.lastName}</td>
                        <td className="p-2 border text-gray-600">{inquiry.contactHome || '-'}</td>
                        <td className="p-2 border text-gray-600">{inquiry.contactStudent || '-'}</td>
                        <td className="p-2 border text-gray-600">{inquiry.contactParent || '-'}</td>
                        <td className="p-2 border text-gray-600">{inquiry.gender || '-'}</td>
                        <td className="p-2 border text-center">
                             <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider border ${
                                inquiry.status==='Open'?'bg-green-100 text-green-700 border-green-200': 
                                inquiry.status==='Recall' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' : 
                                'bg-gray-100 text-gray-600 border-gray-200'
                            }`}>
                                {inquiry.status}
                            </span>
                        </td>
                        <td className="p-2 border text-gray-700">{inquiry.followUpDate ? formatDate(inquiry.followUpDate) : '-'}</td>
                        <td className="p-2 border text-gray-700">
                            {inquiry.followUpDate ? new Date(inquiry.followUpDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '-'}
                        </td>
                        <td className="p-2 border text-gray-600 truncate max-w-xs" title={inquiry.followUpDetails}>{inquiry.followUpDetails || '-'}</td>
                        {/* <td className="p-2 border">
                            <select 
                                className="w-full border p-1 rounded text-xs focus:ring-1 focus:ring-blue-500 outline-none bg-white"
                                value={inquiry.allocatedTo?._id || inquiry.allocatedTo || ''}
                                onChange={(e) => {
                                    const empId = e.target.value;
                                    dispatch(updateInquiry({ id: inquiry._id, data: { allocatedTo: empId } }));
                                }}
                            >
                                <option value="">Unallocated</option>
                                {employees?.filter(e => e.type !== 'Super Admin').map(emp => (
                                    <option key={emp._id} value={emp._id}>{emp.name}</option>
                                ))}
                            </select>
                        </td> */}
                        <td className="p-2 border text-center sticky right-0 bg-white">
                            <div className="flex justify-center gap-1">
                                <button onClick={() => setModal({type:'followup', data:inquiry})} className="bg-purple-50 text-purple-600 border border-purple-200 p-1 rounded hover:bg-purple-100 transition" title="Follow Up">
                                    <PhoneCall size={14}/>
                                </button>
                                <button onClick={() => setModal({type:'view', data:inquiry})} className="bg-teal-50 text-teal-600 border border-teal-200 p-1 rounded hover:bg-teal-100 transition" title="View Print">
                                    <Eye size={14}/>
                                </button>
                                <button onClick={() => setModal({type:'form', data:inquiry})} className="bg-blue-50 text-blue-600 border border-blue-200 p-1 rounded hover:bg-blue-100 transition" title="Edit">
                                    <Edit size={14}/>
                                </button>
                                <button onClick={() => handleDelete(inquiry._id)} className="bg-red-50 text-red-600 border border-red-200 p-1 rounded hover:bg-red-100 transition" title="Delete">
                                    <Trash2 size={14}/>
                                </button>
                            </div>
                        </td>
                    </tr>
                )) : (
                    <tr><td colSpan={user?.role === 'Super Admin' ? 13 : 12} className="text-center py-8 text-gray-400">No inquiries found</td></tr>                )}
            </tbody>
        </table>
      </div>

        {/* Reusable Form Modal */}
        {modal.type === 'form' && (
            <InquiryForm 
                mode="Offline" 
                initialData={modal.data} 
                onClose={() => setModal({type:null})} 
                onSave={handleFormSave}
            />
        )}

        {/* Follow Up Modal */}
        {modal.type === 'followup' && <FollowUpModal inquiry={modal.data} onClose={() => setModal({type:null})} onSave={({id, data}) => dispatch(updateInquiry({id, data}))}/>}

        {/* View Modal */}
        {modal.type === 'view' && <InquiryViewModal inquiry={modal.data} onClose={() => setModal({type:null})} />}
    </div>
  );
};

export default InquiryOffline;