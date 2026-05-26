import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, X, Check, Search } from 'lucide-react';

const SearchableDropdown = ({ 
    options = [], 
    value, 
    onSelect, 
    placeholder = "Search...", 
    label,
    clearLabel = "All References",
    className = "" 
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState(value || '');
    const [filteredOptions, setFilteredOptions] = useState(options);
    const wrapperRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        setQuery(value || '');
    }, [value]);

    useEffect(() => {
        const filtered = options.filter(opt => 
            opt.toLowerCase().includes(query.toLowerCase())
        );
        setFilteredOptions(filtered);
    }, [query, options]);

    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSelect = (option) => {
        setQuery(option);
        onSelect(option);
        setIsOpen(false);
    };

    const handleClear = (e) => {
        e.stopPropagation();
        setQuery('');
        onSelect('');
        if (inputRef.current) inputRef.current.focus();
    };

    return (
        <div className={`relative ${className}`} ref={wrapperRef}>
            {label && (
                <label className="text-xs text-gray-500 font-semibold mb-1 block">
                    {label}
                </label>
            )}
            <div 
                className="relative cursor-pointer"
                onClick={() => {
                    setIsOpen(!isOpen);
                    if (!isOpen && inputRef.current) inputRef.current.focus();
                }}
            >
                <input
                    ref={inputRef}
                    type="text"
                    className="w-full border p-2.5 pr-10 rounded text-sm focus:ring-2 focus:ring-primary outline-none border-gray-300"
                    placeholder={placeholder}
                    value={query}
                    onChange={(e) => {
                        const nextValue = e.target.value;
                        setQuery(nextValue);
                        onSelect(nextValue);
                        if (!isOpen) setIsOpen(true);
                    }}
                />
                <div className="absolute right-2 top-2.5 flex items-center gap-1 text-gray-400">
                    {query && (
                        <button type="button" onClick={handleClear} className="hover:text-gray-600">
                            <X size={16} />
                        </button>
                    )}
                    <ChevronDown size={18} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                </div>
            </div>

            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
                    {filteredOptions.length > 0 ? (
                        <ul>
                            <li 
                                onClick={() => handleSelect('')}
                                className="p-2.5 text-sm hover:bg-gray-100 cursor-pointer text-gray-500 italic border-b"
                            >
                                {clearLabel}
                            </li>
                            {filteredOptions.map((opt, idx) => (
                                <li 
                                    key={idx}
                                    onClick={() => handleSelect(opt)}
                                    className="p-2.5 text-sm hover:bg-blue-50 cursor-pointer flex justify-between items-center group"
                                >
                                    <span className="text-gray-700">{opt}</span>
                                    {value === opt && <Check size={14} className="text-primary" />}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="p-4 text-center text-gray-400 text-sm">
                            No matching references found
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default SearchableDropdown;
