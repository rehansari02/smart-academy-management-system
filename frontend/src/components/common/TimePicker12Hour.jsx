import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

const TimePicker12Hour = ({ value, onChange, disabled = false, compact = false }) => {
    const [hour, setHour] = useState('12');
    const [minute, setMinute] = useState('00');
    const [period, setPeriod] = useState('AM');

    // Parse incoming 24h value (e.g., "14:30")
    useEffect(() => {
        if (!value) return;
        const [hStr, mStr] = value.split(':');
        let h24 = parseInt(hStr, 10);
        if (isNaN(h24)) return;
        
        const m = mStr || '00';
        const p = h24 >= 12 ? 'PM' : 'AM';
        
        let h12 = h24 % 12;
        if (h12 === 0) h12 = 12;
        const h = String(h12).padStart(2, '0');

        setHour(h);
        setMinute(m);
        setPeriod(p);
    }, [value]);

    const notifyChange = (newH, newM, newP) => {
        let h24 = parseInt(newH, 10);
        if (newP === 'PM' && h24 < 12) h24 += 12;
        if (newP === 'AM' && h24 === 12) h24 = 0;
        
        const h24Str = String(h24).padStart(2, '0');
        onChange(`${h24Str}:${newM}`);
    };

    const handleHourChange = (e) => {
        const newH = e.target.value;
        setHour(newH);
        notifyChange(newH, minute, period);
    };

    const handleMinuteChange = (e) => {
        const newM = e.target.value;
        setMinute(newM);
        notifyChange(hour, newM, period);
    };

    const handlePeriodChange = (newP) => {
        setPeriod(newP);
        notifyChange(hour, minute, newP);
    };

    const hours = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
    const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

    return (
        <div className={`flex w-full min-w-0 items-center bg-white border border-gray-300 rounded shadow-sm focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 ${compact ? 'gap-0.5 p-0.5' : 'gap-1 p-1'}`}>
            {!compact && <Clock size={16} className="text-blue-500 ml-1 flex-shrink-0" />}
            <select 
                value={hour} 
                onChange={handleHourChange} 
                disabled={disabled}
                className={`min-w-0 bg-transparent border-none focus:outline-none font-bold text-gray-800 cursor-pointer text-center outline-none ${compact ? 'w-11 p-0.5 text-xs' : 'p-1 text-sm'}`}
            >
                {hours.map(h => <option key={h} value={h}>{h}</option>)}
            </select>
            <span className="shrink-0 text-gray-500 font-bold">:</span>
            <select 
                value={minute} 
                onChange={handleMinuteChange} 
                disabled={disabled}
                className={`min-w-0 bg-transparent border-none focus:outline-none font-bold text-gray-800 cursor-pointer text-center outline-none ${compact ? 'w-11 p-0.5 text-xs' : 'p-1 text-sm'}`}
            >
                {minutes.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <div className={`ml-auto flex flex-shrink-0 rounded border border-gray-200 bg-gray-100 ${compact ? 'p-0' : 'p-0.5'}`}>
                <button 
                    type="button" 
                    onClick={() => handlePeriodChange('AM')} 
                    disabled={disabled}
                    className={`${compact ? 'px-1.5 py-1 text-[10px]' : 'px-2.5 py-1 text-xs'} font-extrabold rounded transition-all duration-150 ${period === 'AM' ? 'bg-blue-600 text-white shadow-md transform scale-105' : 'text-gray-600 hover:text-gray-900'}`}
                >
                    AM
                </button>
                <button 
                    type="button" 
                    onClick={() => handlePeriodChange('PM')} 
                    disabled={disabled}
                    className={`${compact ? 'px-1.5 py-1 text-[10px]' : 'px-2.5 py-1 text-xs'} font-extrabold rounded transition-all duration-150 ${period === 'PM' ? 'bg-blue-600 text-white shadow-md transform scale-105' : 'text-gray-600 hover:text-gray-900'}`}
                >
                    PM
                </button>
            </div>
        </div>
    );
};

export default TimePicker12Hour;
