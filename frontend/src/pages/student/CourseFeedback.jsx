import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { MessageSquare, Send, RefreshCw } from 'lucide-react';
import { toast } from 'react-toastify';
import { submitCourseFeedback, fetchDashboardStats } from '../../features/student/studentPortalSlice'; 

const CourseFeedback = () => {
    const { user } = useSelector((state) => state.auth);
    const { stats, isLoading: isStatsLoading, isError } = useSelector((state) => state.studentPortal);
    const dispatch = useDispatch();

    // Fetch stats to get Course Name if not available
    useEffect(() => {
        if (!stats && !isStatsLoading && !isError) {
            dispatch(fetchDashboardStats());
        }
    }, [dispatch, stats, isStatsLoading, isError]);
    
    // Initial Form State
    const initialFormState = {
        courseName: '', 
        title: '',
        email: user?.email || '',
        mobile: user?.mobile || '',
        feedback: ''
    };

    const [formData, setFormData] = useState(initialFormState);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Auto-fill course name when stats are loaded
    useEffect(() => {
        if (stats?.courseName) {
            setFormData(prev => ({ ...prev, courseName: stats.courseName }));
        }
    }, [stats]);


const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'mobile') {
        // Allow only digits and limit to 10 characters
        if (!/^\d*$/.test(value) || value.length > 10) return;
    }
    setFormData({ ...formData, [name]: value });
};
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        
        try {
            await dispatch(submitCourseFeedback(formData)).unwrap();
            toast.success('Feedback submitted successfully!');
            // Reset form but keep user details
            setFormData({
                ...initialFormState,
                courseName: stats?.courseName || '',
                email: user?.email || '',
                mobile: user?.mobile || ''
            });

        } catch (error) {
            toast.error(error || 'Failed to submit feedback');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReset = () => {
        setFormData({
             ...initialFormState,
             courseName: stats?.courseName || '',
             email: user?.email || '',
             mobile: user?.mobile || ''
        });
    };

    return (
        <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
                <div className="p-6 bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <MessageSquare /> Course Feedback
                    </h1>
                    <p className="text-blue-100 opacity-90 mt-1">We value your feedback. Please let us know your thoughts.</p>
                </div>
                
                <div className="p-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1.5">Course *</label>
                                <input 
                                    type="text"
                                    name="courseName" 
                                    value={formData.courseName} 
                                    onChange={handleChange} 
                                    required 
                                    readOnly // Course name usually shouldn't be changed if fetched from profile
                                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-gray-50 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                />
                            </div>
                             <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1.5">Title / Subject *</label>
                                <input 
                                    type="text" 
                                    name="title" 
                                    value={formData.title} 
                                    onChange={handleChange} 
                                    required 
                                    placeholder="Brief title of your feedback"
                                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1.5">Email ID *</label>
                                <input 
                                    type="email" 
                                    name="email" 
                                    value={formData.email} 
                                    onChange={handleChange} 
                                    required 
                                    readOnly={!!user?.email} // Optional: make read-only if from profile
                                    className={`w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all ${user?.email ? 'bg-gray-50 text-gray-500' : ''}`}
                                />
                            </div>
                             <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1.5">Mobile Number (10 Digits) *</label>
                                <input 
                                    type="text" 
                                    name="mobile" 
                                    value={formData.mobile} 
                                    onChange={handleChange} 
                                    required 
                                    readOnly={!!user?.mobile}
                                    placeholder="Enter Your Mobile Number.."         className={`w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all ${user?.mobile ? 'bg-gray-50 text-gray-500' : ''}`}
                                />
                            </div>
                        </div>

                        <div>
                             <label className="block text-sm font-bold text-gray-700 mb-1.5">Feedback Details *</label>
                             <textarea 
                                name="feedback"
                                value={formData.feedback}
                                onChange={handleChange}
                                required
                                rows="5"
                                placeholder="Please describe your experience or suggestion..."
                                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none"
                             ></textarea>
                        </div>

                        <div className="flex items-center gap-4 pt-4">
                            <button 
                                type="submit" 
                                disabled={isSubmitting}
                                className="px-6 py-2.5 bg-primary text-white rounded-lg flex items-center gap-2 font-bold hover:bg-blue-700 transition-all shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? <RefreshCw className="animate-spin" size={18} /> : <Send size={18} />}
                                Submit Feedback
                            </button>
                             <button 
                                type="button" 
                                onClick={handleReset}
                                className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg flex items-center gap-2 font-bold hover:bg-gray-200 transition-all border border-gray-200"
                            >
                                <RefreshCw size={18} />
                                Reset
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default CourseFeedback;
