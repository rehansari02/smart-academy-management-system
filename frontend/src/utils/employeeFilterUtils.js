export const getScopedEmployeeId = (user, selectedEmployeeId = '') => {
    if (user?.role === 'Super Admin') {
        return selectedEmployeeId || '';
    }

    return user?._id || selectedEmployeeId || '';
};

export const getEmployeeFilterOptions = (employees = [], user) => {
    const safeEmployees = Array.isArray(employees) ? employees : [];
    const currentUserId = user?._id ? String(user._id) : '';
    const currentUserName = user?.name || user?.username || (user?.role === 'Super Admin' ? 'Super Admin' : 'Current User');

    if (!currentUserId) {
        return safeEmployees;
    }

    const existingOption = safeEmployees.find((employee) => String(employee?._id) === currentUserId);
    if (existingOption) {
        if (user?.role === 'Super Admin') {
            return safeEmployees;
        }
        return [existingOption];
    }

    const syntheticOption = {
        _id: currentUserId,
        name: user?.role === 'Super Admin' ? `${currentUserName} (Super Admin)` : currentUserName,
    };

    if (user?.role === 'Super Admin') {
        return [syntheticOption, ...safeEmployees];
    }

    return [syntheticOption];
};

export const getEmployeeNameById = (employeeOptions = [], employeeId, fallback = 'Selected Employee') => {
    if (!employeeId) return fallback;
    return employeeOptions.find((item) => String(item?._id) === String(employeeId))?.name || fallback;
};
