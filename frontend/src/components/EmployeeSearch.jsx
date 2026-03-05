import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Search, X, Check } from 'lucide-react';

const EmployeeSearch = ({ 
    onSelect, 
    label, 
    placeholder = "Search employee by name...", 
    defaultSelectedId, 
    className,
    required = false,
    error,
    additionalFilters = {} 
}) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [initialLoadDone, setInitialLoadDone] = useState(false);
    
    const wrapperRef = useRef(null);
    const inputRef = useRef(null);

    // API URL - aligning with employeeSlice.js
    const API_URL = `${import.meta.env.VITE_API_URL}/employees/`;

    // Debounce Logic
    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (query && query.length >= 2) { 
                searchEmployees();
            } else {
                setResults([]);
            }
        }, 500); 

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

    // Fetch initial employee if defaultSelectedId is provided
    useEffect(() => {
        if (defaultSelectedId && !initialLoadDone) {
            fetchInitialEmployee();
        }
    }, [defaultSelectedId, initialLoadDone]);

    const fetchInitialEmployee = async () => {
        try {
            // Note: The main GET /employees endpoint might return a list or we might need a specific ID endpoint if available.
            // Assuming GET /employees/:id exists or we filter from list. 
            // employeeSlice uses axios.get(API_URL, { params }) for list.
            // Let's assume there is a detail endpoint or we filter. 
            // Actually usually REST APIs have /:id. Let's try that.
            const { data } = await axios.get(`${API_URL}${defaultSelectedId}`, { withCredentials: true });
            setSelectedEmployee(data);
            setQuery(`${data.name} (${data.type || 'Staff'})`);
            setInitialLoadDone(true);
        } catch (error) {
            console.error("Failed to fetch initial employee", error);
            // Fallback: search by ID if specific endpoint fails (less likely but possible safety)
        }
    };

    // Load all employees on mount (optional, maybe just search driven?)
    // StudentSearch loads all on mount. Let's do the same for small lists of employees.
    useEffect(() => {
        if (!initialLoadDone && !defaultSelectedId) {
            loadAllEmployees();
        }
    }, []);

    const loadAllEmployees = async () => {
        setLoading(true);
        try {
            const params = {
                pageSize: 50, 
                ...additionalFilters
            };
            
            const { data } = await axios.get(API_URL, { params, withCredentials: true });
            // API might return array directly or object with data/employees. 
            // employeeSlice line 11: return response.data;
            // Let's assume it returns array or { employees: [] }. 
            // Based on EmployeeMaster line 295: properties are 'employees', so data itself might be the array if slice returns payload directly.
            // Wait, slice: `const response = ... return response.data;`.
            // Slice initialState has `employees: []`. 
            // If the API returns the array directly, then `data` is the array.
            // If API returns { employees: [...] }, then `data.employees` is the array.
            // Let's check logic: `setResults(Array.isArray(data) ? data : data.employees || [])`.
            const list = Array.isArray(data) ? data : (data.employees || []);
            setResults(list);
        } catch (error) {
            console.error("Failed to load employees", error);
            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    const searchEmployees = async () => {
        setLoading(true);
        try {
            const params = {
                searchValue: query, // EmployeeMaster uses 'searchValue' and 'searchBy'='name'
                searchBy: 'name',
                pageSize: query ? 20 : 50,
                ...additionalFilters
            };
            
            const { data } = await axios.get(API_URL, { params, withCredentials: true });
            const list = Array.isArray(data) ? data : (data.employees || []);
            setResults(list);
            setIsOpen(true);
        } catch (error) {
            console.error("Search failed", error);
            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = (employee) => {
        setSelectedEmployee(employee);
        setQuery(`${employee.name} (${employee.type || 'Staff'})`);
        setIsOpen(false);
        if (onSelect) {
            onSelect(employee._id, employee); 
        }
    };

    const clearSelection = (e) => {
        e.stopPropagation();
        setSelectedEmployee(null);
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
            
            <div className="relative group">
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        if (!isOpen && e.target.value) setIsOpen(true);
                        if (!e.target.value) {
                             setSelectedEmployee(null);
                             if (onSelect) onSelect('', null);
                        }
                    }}
                    onFocus={() => {
                        if (results.length > 0) {
                            setIsOpen(true);
                        } else {
                            loadAllEmployees();
                            setIsOpen(true);
                        }
                    }}
                    placeholder={placeholder}
                    className={`w-full border rounded-lg p-2.5 pl-9 pr-8 focus:ring-2 focus:ring-blue-500 outline-none transition-all
                        ${error ? 'border-red-500 bg-red-50' : selectedEmployee ? 'border-blue-300 bg-blue-50/30' : 'border-gray-300'}
                    `}
                />
                
                <Search size={18} className="absolute left-3 top-3 text-gray-400" />
                
                {query && (
                    <button 
                        type="button"
                        onClick={clearSelection}
                        className="absolute right-2 top-2.5 p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-200 transition"
                    >
                        <X size={16} />
                    </button>
                )}
            </div>

            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}

            {/* Recommendation Panel */}
            {isOpen && (query.length >= 0 || results.length > 0) && (
                <div className="absolute z-50 w-full bg-white mt-1 border border-gray-100 rounded-xl shadow-xl max-h-60 overflow-y-auto overflow-x-hidden animate-in fade-in zoom-in-95 duration-100 scrollbar-thin scrollbar-thumb-gray-200">
                    {loading ? (
                        <div className="p-4 text-center text-gray-400 text-sm">Searching...</div>
                    ) : results.length > 0 ? (
                        <ul>
                            {results.map((employee) => (
                                <li 
                                    key={employee._id}
                                    onClick={() => handleSelect(employee)}
                                    className="p-3 hover:bg-blue-50 cursor-pointer border-b border-gray-50 last:border-0 flex justify-between items-center group"
                                >
                                    <div>
                                        <p className="font-medium text-gray-800 text-sm">
                                            {employee.name}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {employee.type} • {employee.mobile}
                                        </p>
                                    </div>
                                    {selectedEmployee && selectedEmployee._id === employee._id && (
                                        <Check size={16} className="text-blue-600" />
                                    )}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="p-4 text-center text-gray-400 text-sm">
                            No employees found matching "{query}"
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default EmployeeSearch;
