import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { ChevronDown, X, Check } from 'lucide-react';

const StudentSearch = ({ 
    onSelect, 
    label, 
    placeholder = "Search student by name or reg no...", 
    defaultSelectedId, 
    className,
    required = false,
    error,
    additionalFilters = {}, // Allow passing extra filters like { isRegistered: 'false' }
    mode = 'student', // 'student' or 'inquiry'
    displayField = 'name', // 'name' or 'regNo'
    includeCancelled = false
}) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [initialLoadDone, setInitialLoadDone] = useState(false);
    
    const wrapperRef = useRef(null);
    const inputRef = useRef(null);

    // API URL Selection
    const API_URL = mode === 'inquiry' 
        ? `${import.meta.env.VITE_API_URL}/transaction/inquiry/`
        : `${import.meta.env.VITE_API_URL}/students/`;

    // Debounce Logic
    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (query && query.length >= 2) { // Start searching after 2 chars
                searchStudents();
            } else {
                setResults([]);
            }
        }, 500); // 500ms delay

        return () => clearTimeout(delayDebounceFn);
    }, [query]);

    // Handle outside click to close dropdown
    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [wrapperRef]);

    // Fetch initial student if defaultSelectedId is provided (Edit Mode)
    useEffect(() => {
        if (defaultSelectedId && !initialLoadDone) {
            fetchInitialStudent();
        }
    }, [defaultSelectedId, initialLoadDone]);

    const fetchInitialStudent = async () => {
        try {
            const { data } = await axios.get(`${API_URL}${defaultSelectedId}`, { withCredentials: true });
            setSelectedStudent(data);
            
            // Name only as requested
            const labelText = `${data.firstName} ${data.middleName || ''} ${data.lastName}`.trim().replace(/\s+/g, ' ');
            setQuery(labelText);
            setInitialLoadDone(true);
        } catch (error) {
            console.error("Failed to fetch initial data", error);
        }
    };

    // Load all students/inquiries with pending status on mount (optional based on props?)
    // Actually, for inquiry filter, we might not want to load ALL on mount if there are thousands.
    // Keeping logic consistent for now but checking if mode='student' for original behavior
    useEffect(() => {
        if (!initialLoadDone && !defaultSelectedId) {
            loadAllStudents();
        }
    }, [JSON.stringify(additionalFilters)]);

    const loadAllStudents = async () => {
        setLoading(true);
        try {
            const params = {
                pageSize: 50, // Show more students initially
                isCancelled: includeCancelled ? 'all' : 'false',
                ...additionalFilters
            };
            
            const { data } = await axios.get(API_URL, { params, withCredentials: true });
            
            if (mode === 'inquiry') {
                setResults(Array.isArray(data) ? data : (data.inquiries || [])); // Handle potential diff response structure
            } else {
                setResults(data.students || []); 
            }

        } catch (error) {
            console.error("Failed to load list", error);
            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    const searchStudents = async () => {
        setLoading(true);
        try {
            // Merge query with additional filters
            const params = {
                studentName: query,
                pageSize: query ? 10 : 50, // Show more when no search query
                isCancelled: includeCancelled ? 'all' : 'false',
                ...additionalFilters
            };
            
            const { data } = await axios.get(API_URL, { params, withCredentials: true });
            
            if (mode === 'inquiry') {
                setResults(Array.isArray(data) ? data : (data.inquiries || []));
            } else {
                setResults(data.students || []); 
            }
            
            setIsOpen(true);
        } catch (error) {
            console.error("Search failed", error);
            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = (item) => {
        setSelectedStudent(item);
        
        // Custom label based on displayField
        let labelText = '';
        if (displayField === 'regNo') {
            labelText = item.regNo || '';
        } else {
            labelText = `${item.firstName} ${item.middleName || ''} ${item.lastName}`.trim().replace(/\s+/g, ' ');
        }
        
        setQuery(labelText);
        setIsOpen(false);
        if (onSelect) {
            onSelect(item._id, item); // Pass simplified ID and full object
        }
    };

    const clearSelection = (e) => {
        e.stopPropagation();
        setSelectedStudent(null);
        setQuery('');
        setResults([]);
        if (onSelect) {
            onSelect('', null);
        }
        if(inputRef.current) inputRef.current.focus();
    };

    return (
        <div className={`relative ${className}`} ref={wrapperRef}>
            {label && (
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
            )}
            
            <div 
                className="relative group cursor-pointer"
                onClick={() => {
                    if (!isOpen) { 
                        setIsOpen(true);
                        if(inputRef.current) inputRef.current.focus();
                    }
                }}
            >
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        if (!isOpen && e.target.value) setIsOpen(true);
                        if (!e.target.value) {
                             setSelectedStudent(null);
                             if (onSelect) onSelect('', null);
                        }
                    }}
                    onFocus={() => {
                        if (results.length > 0) {
                            setIsOpen(true);
                        } else {
                            loadAllStudents();
                            setIsOpen(true);
                        }
                    }}
                    placeholder={placeholder}
                    className={`w-full border rounded-lg p-2.5 pr-10 pl-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all cursor-pointer
                        ${error ? 'border-red-500 bg-red-50' : selectedStudent ? 'border-blue-300 bg-blue-50/30' : 'border-gray-300'}
                    `}
                />
                
                <div className="absolute right-3 top-3 flex items-center gap-1">
                    {query && (
                        <button 
                            type="button"
                            onClick={clearSelection}
                            className="p-0.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-200 transition"
                        >
                            <X size={16} />
                        </button>
                    )}
                    <ChevronDown 
                        size={18} 
                        className={`text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} 
                    />
                </div>
            </div>

            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}

            {/* Recommendation Panel */}
            {isOpen && (query.length >= 2 || results.length > 0) && (
                <div className="absolute z-50 w-full bg-white mt-1 border border-gray-100 rounded-xl shadow-xl max-h-60 overflow-y-auto overflow-x-hidden animate-in fade-in zoom-in-95 duration-100 scrollbar-thin scrollbar-thumb-gray-200">
                    {loading ? (
                        <div className="p-4 text-center text-gray-400 text-sm">Searching...</div>
                    ) : results.length > 0 ? (
                        <ul>
                            {results.map((item) => (
                                <li 
                                    key={item._id}
                                    onClick={() => handleSelect(item)}
                                    className="p-3 hover:bg-blue-50 cursor-pointer border-b border-gray-50 last:border-0 flex justify-between items-center group"
                                >
                                    <div>
                                        <p className="font-medium text-gray-800 text-sm">
                                            {item.firstName} {item.middleName} {item.lastName}
                                        </p>
                                        {item.regNo && (
                                            <p className="text-[10px] text-blue-600 font-bold font-mono">
                                                Ref: {item.regNo}
                                            </p>
                                        )}
                                    </div>
                                    {selectedStudent && selectedStudent._id === item._id && (
                                        <Check size={16} className="text-blue-600" />
                                    )}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="p-4 text-center text-gray-400 text-sm">
                            No results found matching "{query}"
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default StudentSearch;
