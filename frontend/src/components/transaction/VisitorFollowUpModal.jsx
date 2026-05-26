import React, { useState } from 'react';
import { X, PhoneCall } from 'lucide-react';
import TimePicker12Hour from '../common/TimePicker12Hour';

const toDateInput = (value) => {
    if (!value) return new Date().toISOString().split('T')[0];
    return new Date(value).toISOString().split('T')[0];
};

const toTimeInput = (value) => {
    if (!value) return new Date().toTimeString().slice(0, 5);
    return new Date(value).toTimeString().slice(0, 5);
};

const VisitorFollowUpModal = ({ visitor, onClose, onSave }) => {
    const latestFollowUp = visitor?.latestVisitorFollowUp;
    const [followUpDate, setFollowUpDate] = useState(toDateInput(latestFollowUp?.scheduledDate));
    const [followUpTime, setFollowUpTime] = useState(toTimeInput(latestFollowUp?.scheduledDate));
    const [status, setStatus] = useState(latestFollowUp?.status || visitor?.status || 'Open');
    const [newRemarks, setNewRemarks] = useState('');
    const [saving, setSaving] = useState(false);

    if (!visitor) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        const scheduledDate = followUpDate ? new Date(`${followUpDate}T${followUpTime || '00:00'}`).toISOString() : '';

        setSaving(true);
        try {
            await onSave(visitor._id, {
                visitorId: visitor._id,
                scheduledDate,
                status,
                remark: newRemarks.trim()
            });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center p-4 border-b bg-purple-50">
                    <div>
                        <h3 className="font-bold text-purple-800 flex items-center gap-2">
                            <PhoneCall size={18} /> Visitor Follow-up
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5">{visitor.studentName} - {visitor.mobileNumber || 'No mobile'}</p>
                    </div>
                    <button type="button" onClick={onClose} className="p-1 rounded hover:bg-purple-100 text-gray-500">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                            <label className="text-xs font-bold block mb-1">Visitor Status</label>
                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                className="border p-2 rounded w-full text-sm"
                            >
                                <option value="Open">Open</option>
                                <option value="InProgress">InProgress</option>
                                <option value="Recall">Recall</option>
                                <option value="Pending">Pending</option>
                                <option value="Close">Close</option>
                                <option value="Complete">Complete</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold block mb-1">Next Visit Date</label>
                            <input
                                type="date"
                                value={followUpDate}
                                onChange={(e) => setFollowUpDate(e.target.value)}
                                required
                                className="border p-2 rounded w-full text-sm"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold block mb-1">Time</label>
                            <TimePicker12Hour value={followUpTime} onChange={setFollowUpTime} />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold block mb-1">Previous Follow-up Note</label>
                        <div className="border p-2 rounded w-full text-sm h-24 overflow-y-auto bg-gray-50 text-gray-700 whitespace-pre-wrap">
                            {visitor.followUpDetails || latestFollowUp?.remark || 'No previous follow-up notes'}
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold block mb-1">New Follow-up Note</label>
                        <textarea
                            value={newRemarks}
                            onChange={(e) => setNewRemarks(e.target.value)}
                            className="border p-2 rounded w-full text-sm"
                            rows="3"
                            placeholder="Example: Student will visit office with parents..."
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={saving}
                        className="w-full bg-purple-600 text-white py-2 rounded font-bold hover:bg-purple-700 disabled:opacity-70"
                    >
                        {saving ? 'Saving...' : 'Save Visitor Follow-up'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default VisitorFollowUpModal;
