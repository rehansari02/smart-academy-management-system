import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
    fetchFreeLearningQuestions, 
    createFreeLearningQuestion, 
    updateFreeLearningQuestion, 
    deleteFreeLearningQuestion,
    resetMasterStatus 
} from '../../../features/master/masterSlice';
import { Search, RefreshCw, Plus, Edit, Trash2, Save, X, CheckSquare, Square } from 'lucide-react';
import { toast } from 'react-toastify';
import moment from 'moment';

const FreeLearning = () => {
    const dispatch = useDispatch();
    const { freeLearningQuestions, isLoading, isSuccess, message } = useSelector((state) => state.master);
    
    // Filter State
    const [filters, setFilters] = useState({
        fromDate: '',
        toDate: new Date().toISOString().split('T')[0],
        search: ''
    });

    // Form State
    const [formData, setFormData] = useState({
        id: null,
        question: '',
        options: ['', '', '', ''],
        correctOption: 0,
        isActive: true
    });
    const [showForm, setShowForm] = useState(false);

    useEffect(() => {
        dispatch(fetchFreeLearningQuestions(filters));
    }, [dispatch, filters.toDate]); // Re-fetch when toDate changes (and initial load)

    useEffect(() => {
        if (message) {
            if (isSuccess) {
                toast.success(message);
                setShowForm(false);
                resetForm();
            } else {
                toast.error(message);
            }
            dispatch(resetMasterStatus());
        }
    }, [isSuccess, message, dispatch]);

    const handleFilterChange = (e) => {
        setFilters({ ...filters, [e.target.name]: e.target.value });
    };

    const resetFilters = () => {
        setFilters({
            fromDate: '',
            toDate: new Date().toISOString().split('T')[0],
            search: ''
        });
        dispatch(fetchFreeLearningQuestions({
            fromDate: '',
            toDate: new Date().toISOString().split('T')[0],
            search: ''
        }));
    };

    const handleSearch = () => {
        dispatch(fetchFreeLearningQuestions(filters));
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleOptionChange = (index, value) => {
        const newOptions = [...formData.options];
        newOptions[index] = value;
        setFormData(prev => ({ ...prev, options: newOptions }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        // Validation
        if (!formData.question || formData.options.some(opt => !opt.trim())) {
            toast.error("Please fill in question and all options.");
            return;
        }

        const payload = {
            question: formData.question,
            options: formData.options,
            correctOption: parseInt(formData.correctOption),
            isActive: formData.isActive
        };

        if (formData.id) {
            dispatch(updateFreeLearningQuestion({ id: formData.id, data: payload }));
        } else {
            dispatch(createFreeLearningQuestion(payload));
        }
    };

    const handleEdit = (q) => {
        setFormData({
            id: q._id,
            question: q.question,
            options: [...q.options],
            correctOption: q.correctOption,
            isActive: q.isActive
        });
        setShowForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = (id) => {
        if (window.confirm("Are you sure you want to delete this question?")) {
            dispatch(deleteFreeLearningQuestion(id));
        }
    };

    const resetForm = () => {
        setFormData({
            id: null,
            question: '',
            options: ['', '', '', ''],
            correctOption: 0,
            isActive: true
        });
    };

    return (
        <div className="container mx-auto p-4">
            
            {/* --- Filter Section --- */}
            <div className="bg-white p-4 rounded-lg shadow mb-6 border border-gray-200">
                <h2 className="text-sm font-bold text-gray-700 uppercase mb-3 flex items-center gap-2">
                    <Search size={16}/> Filter Questions
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                    <div>
                        <label className="text-xs text-gray-500">From Date</label>
                        <input type="date" name="fromDate" value={filters.fromDate} onChange={handleFilterChange} className="w-full border p-1 rounded text-sm"/>
                    </div>
                    <div>
                        <label className="text-xs text-gray-500">To Date</label>
                        <input type="date" name="toDate" value={filters.toDate} onChange={handleFilterChange} className="w-full border p-1 rounded text-sm"/>
                    </div>
                    <div>
                        <label className="text-xs text-gray-500">Search Question</label>
                        <input type="text" name="search" value={filters.search} onChange={handleFilterChange} className="w-full border p-1 rounded text-sm" placeholder="Search..."/>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={resetFilters} className="bg-gray-200 p-2 rounded hover:bg-gray-300 text-gray-700 flex-1 flex justify-center"><RefreshCw size={18}/></button>
                        <button onClick={handleSearch} className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700 flex-1 flex justify-center">Search</button>
                    </div>
                </div>
            </div>

            {/* --- Add New / Edit Section --- */}
            <div className="mb-6">
                 {!showForm ? (
                    <button onClick={() => setShowForm(true)} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 flex items-center gap-2 shadow text-sm font-medium">
                        <Plus size={18}/> Add New Question
                    </button>
                 ) : (
                    <div className="bg-white p-6 rounded-lg shadow border border-blue-100">
                        <div className="flex justify-between items-center mb-4 border-b pb-2">
                            <h3 className="text-lg font-bold text-gray-800">{formData.id ? 'Edit Question' : 'Add New Question'}</h3>
                            <button onClick={() => { setShowForm(false); resetForm(); }} className="text-gray-400 hover:text-red-500"><X size={20}/></button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Question</label>
                                <textarea 
                                    name="question" 
                                    value={formData.question} 
                                    onChange={handleInputChange} 
                                    className="w-full border rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                    rows="2"
                                    placeholder="Enter question here..."
                                    required
                                />
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {[0, 1, 2, 3].map((idx) => (
                                    <div key={idx}>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Option {idx + 1}</label>
                                        <input 
                                            type="text" 
                                            value={formData.options[idx]} 
                                            onChange={(e) => handleOptionChange(idx, e.target.value)} 
                                            className="w-full border rounded p-2 text-sm focus:border-blue-500 outline-none"
                                            placeholder={`Option ${idx + 1}`}
                                            required
                                        />
                                    </div>
                                ))}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Correct Answer</label>
                                    <select 
                                        name="correctOption" 
                                        value={formData.correctOption} 
                                        onChange={handleInputChange} 
                                        className="w-full border rounded p-2 text-sm bg-gray-50"
                                    >
                                        {formData.options.map((opt, idx) => (
                                            <option key={idx} value={idx}>
                                                Option {idx + 1} {opt ? `- ${opt.substring(0, 30)}...` : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                
                                <div className="flex items-center pt-6">
                                    <label className="flex items-center gap-2 cursor-pointer select-none">
                                        <input 
                                            type="checkbox" 
                                            name="isActive" 
                                            checked={formData.isActive} 
                                            onChange={handleInputChange} 
                                            className="w-4 h-4 text-blue-600 rounded"
                                        />
                                        <span className="text-sm font-medium text-gray-700">Is Active?</span>
                                    </label>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t mt-4">
                                <button type="button" onClick={() => { setShowForm(false); resetForm(); }} className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-50">Cancel</button>
                                <button type="submit" disabled={isLoading} className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 flex items-center gap-2">
                                    <Save size={18}/> {isLoading ? 'Saving...' : 'Save Question'}
                                </button>
                            </div>
                        </form>
                    </div>
                 )}
            </div>

            {/* --- Table Section --- */}
            <div className="bg-white rounded-lg shadow overflow-x-auto border">
                <table className="w-full border-collapse min-w-[800px]">
                    <thead>
                        <tr className="bg-blue-600 text-white text-left text-xs uppercase tracking-wider">
                            <th className="p-3 border font-semibold w-12 text-center">#</th>
                            <th className="p-3 border font-semibold">Question</th>
                            <th className="p-3 border font-semibold w-48">Created By</th>
                            <th className="p-3 border font-semibold w-32">Date</th>
                            <th className="p-3 border font-semibold w-24 text-center">Status</th>
                            <th className="p-3 border font-semibold w-24 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {freeLearningQuestions && freeLearningQuestions.length > 0 ? (
                            freeLearningQuestions.map((q, index) => (
                                <tr key={q._id} className="hover:bg-blue-50 text-sm border-b border-gray-100 transition-colors">
                                    <td className="p-3 border text-center text-gray-500">{index + 1}</td>
                                    <td className="p-3 border font-medium text-gray-800">
                                        {q.question}
                                        <div className="text-xs text-gray-400 mt-1">
                                            Ans: <span className="text-green-600 font-semibold">{q.options[q.correctOption]}</span>
                                        </div>
                                    </td>
                                    <td className="p-3 border text-gray-600">
                                        {q.createdBy?.name || q.createdBy?.email || 'Admin'}
                                    </td>
                                    <td className="p-3 border text-gray-600 whitespace-nowrap">
                                        {moment(q.createdAt).format('DD/MM/YYYY')}
                                    </td>
                                    <td className="p-3 border text-center">
                                        {q.isActive ? (
                                            <span className="text-green-600 flex justify-center"><CheckSquare size={18}/></span>
                                        ) : (
                                            <span className="text-gray-400 flex justify-center"><Square size={18}/></span>
                                        )}
                                    </td>
                                    <td className="p-3 border text-center">
                                        <div className="flex justify-center gap-2">
                                            <button onClick={() => handleEdit(q)} className="text-blue-600 hover:bg-blue-100 p-1 rounded transition" title="Edit">
                                                <Edit size={16}/>
                                            </button>
                                            <button onClick={() => handleDelete(q._id)} className="text-red-500 hover:bg-red-100 p-1 rounded transition" title="Delete">
                                                <Trash2 size={16}/>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="6" className="text-center py-8 text-gray-500">No questions found. Add one to get started!</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

        </div>
    );
};

export default FreeLearning;
