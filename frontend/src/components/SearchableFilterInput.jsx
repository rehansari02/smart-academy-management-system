import React, { useMemo, useRef, useState } from 'react';

const SearchableFilterInput = ({
  label,
  name,
  value,
  options = [],
  onChange,
  placeholder = 'Type to search...',
  helperText = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const blurTimer = useRef(null);

  const filteredOptions = useMemo(() => {
    const search = String(value || '').toLowerCase().trim();
    const uniqueOptions = [...new Set(options.map(option => String(option || '').trim()).filter(Boolean))];

    if (!search) return uniqueOptions.slice(0, 20);
    return uniqueOptions.filter(option => option.toLowerCase().includes(search)).slice(0, 20);
  }, [options, value]);

  const updateValue = (nextValue) => {
    onChange({ target: { name, value: nextValue } });
  };

  return (
    <div className="relative">
      <label className="text-xs font-bold text-gray-600 uppercase">{label}</label>
      <input
        type="text"
        name={name}
        value={value}
        onChange={(event) => {
          updateValue(event.target.value);
          setIsOpen(true);
        }}
        onFocus={() => {
          if (blurTimer.current) clearTimeout(blurTimer.current);
          setIsOpen(true);
        }}
        onBlur={() => {
          blurTimer.current = setTimeout(() => setIsOpen(false), 150);
        }}
        className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-blue-100"
        placeholder={placeholder}
        autoComplete="off"
      />

      {isOpen && (
        <div className="absolute left-0 right-0 z-40 mt-1 max-h-56 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
          {filteredOptions.length > 0 ? (
            filteredOptions.map(option => (
              <button
                key={option}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  updateValue(option);
                  setIsOpen(false);
                }}
                className="block w-full px-3 py-2 text-left text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-primary"
              >
                {option}
              </button>
            ))
          ) : (
            <div className="px-3 py-3 text-center text-xs text-gray-400">No matching option. You can type manually.</div>
          )}
        </div>
      )}

      {helperText && <p className="mt-1 text-[11px] text-gray-400">{helperText}</p>}
    </div>
  );
};

export default SearchableFilterInput;
