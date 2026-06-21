export const formatDate = (dateString) => {
    if (!dateString) return '-';
    // Handle specific checks if needed, but Date constructor is robust
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}/${month}/${year}`;
};

/**
 * Returns today's date in YYYY-MM-DD format based on local time.
 * Reliable for date inputs even after midnight.
 */
export const getTodayDateISO = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * Converts a date value to YYYY-MM-DD using local time for date inputs.
 */
export const getDateInputValue = (value) => {
    if (!value) return getTodayDateISO();
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return getTodayDateISO();

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

